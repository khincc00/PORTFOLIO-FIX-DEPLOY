import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

// ---- Tiruan Supabase: query builder yang bisa dirantai dan hasilnya bisa diatur per tabel
const state = vi.hoisted(() => ({
  viewer: { user: null as any, isAdmin: false, visitor: { id: "v" } },
  tables: {} as Record<string, any>,
  inserted: [] as any[],
}));
vi.mock("@/lib/supabase-admin", () => {
  const builder = (table: string) => {
    const result = () => state.tables[table] ?? { data: [], error: null };
    const b: any = new Proxy(() => {}, {
      get: (_t, prop) => {
        if (prop === "then") return (res: any) => Promise.resolve(result()).then(res);
        if (prop === "insert") return (row: any) => { state.inserted.push({ table, row }); return b; };
        if (prop === "single" || prop === "maybeSingle") return () => Promise.resolve(result());
        return () => b;
      },
    });
    return b;
  };
  return {
    isAdminDbConfigured: true,
    supabaseAdmin: {
      from: builder,
      storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/community-images/${p}` } }), remove: async () => ({}) }) },
    },
  };
});
vi.mock("@/lib/interactions-server", () => ({ getViewer: async () => state.viewer }));
vi.mock("@/lib/i18n-server", () => ({ st: async (k: string) => k }));
vi.mock("@/lib/user-auth", () => ({ getIpHash: () => "iphash" }));

import { countLinks, tidyText } from "@/lib/community";
import { pathFromImageUrl, sniffImage } from "@/lib/community-server";
import { POST as createPost } from "@/app/api/community/posts/route";
import { POST as vote } from "@/app/api/community/vote/route";

const req = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://khincreator.com/api/x", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
const GOOD = "https://x.supabase.co/storage/v1/object/public/community-images/7/6f1c2d3e-aaaa-bbbb-cccc-111122223333.png";

beforeEach(() => {
  state.viewer = { user: null, isAdmin: false, visitor: { id: "v" } };
  state.tables = {};
  state.inserted = [];
});

describe("Komunitas: gambar", () => {
  it("mengenali gambar dari isinya, bukan dari nama", () => {
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))?.ext).toBe("jpg");
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))?.ext).toBe("png");
    expect(sniffImage(Buffer.from("RIFF\0\0\0\0WEBPVP8 "))?.ext).toBe("webp");
    expect(sniffImage(Buffer.from("GIF89a\0\0\0\0"))?.ext).toBe("gif");
  });
  it("menolak HTML / SVG / skrip yang disamarkan jadi gambar", () => {
    expect(sniffImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' onload='alert(1)'/>"))).toBeNull();
    expect(sniffImage(Buffer.from("<html><script>alert(1)</script></html>"))).toBeNull();
  });
  it("hanya menerima alamat dari bucket komunitas dengan format yang benar", () => {
    expect(pathFromImageUrl(GOOD)).toBe("7/6f1c2d3e-aaaa-bbbb-cccc-111122223333.png");
    expect(pathFromImageUrl("https://evil.example/pixel.png")).toBeNull();
    expect(pathFromImageUrl(GOOD.replace("/7/", "/../"))).toBeNull();
    expect(pathFromImageUrl(GOOD.replace(".png", ".svg"))).toBeNull();
  });
});

describe("Komunitas: teks", () => {
  it("menghitung link dan merapikan baris kosong", () => {
    expect(countLinks("http://a.com dan www.b.com")).toBe(2);
    expect(tidyText("a\r\n\n\n\nb  ")).toBe("a\n\nb");
  });
});

describe("Komunitas: API kiriman", () => {
  it("menolak pengunjung yang belum login (401)", async () => {
    const res = await createPost(req({ title: "Halo dunia" }));
    expect(res.status).toBe(401);
  });
  it("menolak permintaan dari website lain (403)", async () => {
    state.viewer.user = { id: 7, username: "u", display_name: "U" };
    const res = await createPost(req({ title: "Halo dunia" }, { Origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });
  it("menolak judul terlalu pendek dan terlalu banyak link", async () => {
    state.viewer.user = { id: 7, username: "u", display_name: "U" };
    expect((await createPost(req({ title: "ab" }))).status).toBe(400);
    expect((await createPost(req({ title: "Judul oke", body: "http://a.co http://b.co http://c.co http://d.co" }))).status).toBe(400);
  });
  it("menolak gambar dari luar bucket atau yang bukan milik pengunggah", async () => {
    state.viewer.user = { id: 7, username: "u", display_name: "U" };
    expect((await createPost(req({ title: "Judul oke", images: ["https://evil.example/a.png"] }))).status).toBe(400);
    state.tables.community_uploads = { data: [], error: null }; // tidak ada catatan upload milik user ini
    expect((await createPost(req({ title: "Judul oke", images: [GOOD] }))).status).toBe(400);
    expect(state.inserted.filter((i) => i.table === "community_posts")).toHaveLength(0);
  });
  it("menerima kiriman valid dengan gambar milik sendiri", async () => {
    state.viewer.user = { id: 7, username: "u", display_name: "U" };
    state.tables.community_uploads = { data: [{ path: "7/6f1c2d3e-aaaa-bbbb-cccc-111122223333.png" }], error: null };
    state.tables.community_posts = { data: { id: 42 }, error: null };
    const res = await createPost(req({ title: "Judul oke", body: "isi", images: [GOOD] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 42 });
    const row = state.inserted.find((i) => i.table === "community_posts").row;
    expect(row.user_id).toBe(7);
  });
  it("jebakan bot: kolom website terisi → pura-pura berhasil tanpa menyimpan", async () => {
    state.viewer.user = { id: 7, username: "u", display_name: "U" };
    const res = await createPost(req({ title: "Judul oke", website: "spam" }));
    expect(await res.json()).toEqual({ ok: true });
    expect(state.inserted).toHaveLength(0);
  });
});

describe("Komunitas: admin sebagai penulis", () => {
  it("admin tanpa akun anggota bisa membuat kiriman atas nama akun Khincc", async () => {
    state.viewer = { user: null, isAdmin: true, visitor: { id: "v" } };
    state.tables.site_users = { data: { id: 99, username: "khincc", display_name: "Khincc" }, error: null };
    state.tables.community_posts = { data: { id: 5 }, error: null };
    const res = await createPost(req({ title: "Pengumuman update", body: "Halo semua" }));
    expect(res.status).toBe(200);
    expect(state.inserted.find((i) => i.table === "community_posts").row.user_id).toBe(99);
  });
  it("anggota yang login memakai akunnya sendiri, bukan akun admin", async () => {
    state.viewer = { user: { id: 7, username: "u", display_name: "U" }, isAdmin: true, visitor: { id: "v" } };
    state.tables.community_posts = { data: { id: 6 }, error: null };
    await createPost(req({ title: "Kiriman anggota" }));
    expect(state.inserted.find((i) => i.table === "community_posts").row.user_id).toBe(7);
  });
});

describe("Komunitas: vote", () => {
  it("wajib login dan hanya menerima nilai -1, 0, 1", async () => {
    expect((await vote(req({ type: "post", id: 1, value: 1 }))).status).toBe(401);
    state.viewer.user = { id: 7, username: "u", display_name: "U" };
    expect((await vote(req({ type: "post", id: 1, value: 5 }))).status).toBe(400);
    expect((await vote(req({ type: "bukan", id: 1, value: 1 }))).status).toBe(400);
  });
});
