import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdmin, isAdminDbConfigured } from "@/lib/supabase-admin";
import type { SyncState } from "@/lib/studio-types";

const repo =
  process.env.CONTENT_GITHUB_REPOSITORY || "khincc00/PORTFOLIO-FIX-DEPLOY";
const branch = process.env.CONTENT_GITHUB_BRANCH || "content-sync";
const path = "content/published.json";
const token = process.env.CONTENT_GITHUB_TOKEN;

export async function getSyncStatus(): Promise<SyncState> {
  if (!isAdminDbConfigured || !token)
    return {
      configured: false,
      status: "setup",
      message:
        "Sinkronisasi belum diaktifkan. Atur kredensial server dan jalankan migrasi Studio.",
    };
  const { data, error } = await supabaseAdmin
    .from("studio_sync")
    .select("*")
    .eq("id", 1)
    .single();
  if (error || !data)
    return {
      configured: false,
      status: "setup",
      message:
        "Migrasi studio_sync belum tersedia. Jalankan SQL migrasi Studio.",
    };
  const status =
    data.lease_until && new Date(data.lease_until) > new Date()
      ? "syncing"
      : data.last_error
        ? "error"
        : data.synced_version < data.version
          ? "pending"
          : "synced";
  return {
    configured: true,
    status,
    version: data.version,
    synced_version: data.synced_version,
    last_synced_at: data.last_synced_at,
    commit_url: data.commit_url,
    message:
      status === "synced"
        ? "Konten terbit telah diarsipkan ke GitHub."
        : status === "syncing"
          ? "Konten sedang dikirim ke GitHub."
          : status === "error"
            ? data.last_error
            : "Ada perubahan yang menunggu sinkronisasi.",
  };
}

async function github(endpoint: string, init?: RequestInit) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo))
    throw new Error("Konfigurasi repositori tidak valid.");
  return fetch(`https://api.github.com/repos/${repo}/${endpoint}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
  });
}

/** Only published, allowlisted fields leave the server. Never export raw tables. */
export async function syncPublishedContent(): Promise<SyncState> {
  const before = await getSyncStatus();
  if (!before.configured) return before;
  const worker = randomUUID();
  const { data: claimed, error: claimError } = await supabaseAdmin.rpc(
    "claim_studio_sync",
    { worker },
  );
  if (claimError)
    return {
      ...before,
      status: "error",
      message: "Antrean sinkronisasi tidak dapat dikunci. Periksa migrasi.",
    };
  if (!claimed)
    return {
      ...before,
      status: "syncing",
      message:
        "Proses sinkronisasi lain masih berjalan. Perubahan berikutnya tetap dalam antrean.",
    };
  let resultURL: string | null = null;
  let failure: string | null = null;
  try {
    const content = Buffer.from(
      JSON.stringify(claimed.snapshot, null, 2) + "\n",
    ).toString("base64");
    let done = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await github(
        `contents/${path}?ref=${encodeURIComponent(branch)}`,
      );
      let sha: string | undefined;
      if (current.ok) {
        const existing = await current.json();
        sha = existing.sha;
        if (
          typeof existing.content === "string" &&
          existing.content.replace(/\s/g, "") === content
        ) {
          // Preserve the previous commit URL when no new commit is necessary.
          resultURL =
            before.commit_url ||
            `https://github.com/${repo}/blob/${encodeURIComponent(branch)}/${path}`;
          done = true;
          break;
        }
      } else if (current.status !== 404) {
        throw new Error(
          `GitHub menolak pembacaan (HTTP ${current.status}). Periksa izin token server.`,
        );
      }
      const saved = await github(`contents/${path}`, {
        method: "PUT",
        body: JSON.stringify({
          message: `content: sync published studio snapshot v${claimed.version} [skip ci]`,
          content,
          branch,
          ...(sha ? { sha } : {}),
        }),
      });
      if (saved.ok) {
        const data = await saved.json();
        resultURL = data.commit?.html_url || null;
        done = true;
        break;
      }
      if (saved.status === 409 || saved.status === 422) {
        if (attempt < 2) continue;
      }
      throw new Error(
        `GitHub belum menerima arsip (HTTP ${saved.status}). Periksa branch dan izin Contents: write.`,
      );
    }
    if (!done)
      throw new Error("Konflik GitHub belum terselesaikan. Coba ulang.");
  } catch (err) {
    failure =
      err instanceof Error && !/fetch|abort|timeout/i.test(err.message)
        ? err.message
        : "Koneksi GitHub gagal. Konten website tersimpan; sinkronisasi dapat dicoba ulang.";
  }
  const { error } = await supabaseAdmin.rpc("finish_studio_sync", {
    worker,
    captured_version: claimed.version,
    result_url: resultURL,
    error_message: failure,
  });
  if (error)
    return {
      ...before,
      status: "error",
      message:
        "Status sinkronisasi belum tersimpan. Antrean akan tersedia kembali setelah lease berakhir.",
    };
  return getSyncStatus();
}

/** Called after a successful content mutation. Never undo a committed CMS save. */
export async function trySyncPublishedContent() {
  try {
    return await syncPublishedContent();
  } catch {
    return {
      status: "error",
      message: "Konten tersimpan; sinkronisasi GitHub perlu dicoba ulang.",
    };
  }
}
