"use client";

import { useCallback, useEffect, useState } from "react";
import NewsEditor from "@/app/admin/NewsEditor";
import NewsList from "@/app/admin/NewsList";
import PortfolioManager from "@/app/admin/PortfolioManager";
import CommentsList from "@/app/admin/CommentsList";
import InvoiceBuilder from "./InvoiceBuilder";
import { Icon, StudioLogo } from "@/components/StudioIcon";
import { adminFetch } from "@/lib/admin-fetch";
import type { NewsPost } from "@/lib/news";
import { coverOf, type PortfolioItem } from "@/lib/portfolio-items";
import type { Contact, SyncState } from "@/lib/studio-types";
import { createInvoice, type Invoice } from "@/lib/invoice";
import "./studio.css";

type View =
  | "home"
  | "news"
  | "work"
  | "inbox"
  | "settings"
  | "editor"
  | "comments"
  | "invoice";
const nav: { key: View; label: string; icon: string }[] = [
  { key: "home", label: "Ringkasan", icon: "home" },
  { key: "news", label: "Berita", icon: "news" },
  { key: "work", label: "Portofolio", icon: "work" },
  { key: "inbox", label: "Inbox", icon: "inbox" },
  { key: "invoice", label: "Invoice", icon: "invoice" },
  { key: "settings", label: "Pengaturan", icon: "settings" },
];
const initialSync: SyncState = {
  configured: false,
  status: "setup",
  message: "Memeriksa koneksi GitHub…",
};
const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });

export default function StudioClient({
  preview = false,
}: {
  preview?: boolean;
}) {
  const [auth, setAuth] = useState<"loading" | "login" | "ready">("loading");
  const [view, setView] = useState<View>("home");
  const [dark, setDark] = useState(false);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [works, setWorks] = useState<PortfolioItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [sync, setSync] = useState<SyncState>(initialSync);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [install, setInstall] = useState(false);
  const [post, setPost] = useState<NewsPost | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [dbReady, setDbReady] = useState(false);
  // Disimpan di level ini agar draft invoice tidak hilang saat berpindah menu
  const [invoice, setInvoice] = useState<Invoice>(createInvoice);

  const refreshSync = useCallback(async () => {
    try {
      const r = await adminFetch("/api/admin/sync");
      if (r.ok) setSync(await r.json());
    } catch {
      setSync({
        configured: false,
        status: "error",
        message: "Status GitHub tidak dapat dimuat. Coba lagi.",
      });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all(
        [
          "/api/admin/news",
          "/api/admin/portfolio-items",
          "/api/admin/data",
        ].map((url) => adminFetch(url)),
      );
      const values = await Promise.all(responses.map((r) => r.json()));
      if (responses.some((r) => r.status === 401)) {
        setAuth("login");
        return;
      }
      if (responses[0].ok) setNews(values[0]);
      if (responses[1].ok) setWorks(values[1]);
      if (responses[2].ok) {
        setContacts(values[2].contactList || []);
        setDbReady(
          Boolean(values[2].isAdminDbConfigured && !values[2].dbError),
        );
      }
      const failed = responses.findIndex((r) => !r.ok);
      if (failed >= 0)
        setError(values[failed].error || "Sebagian konten belum dapat dimuat.");
      else if (values[2].dbError) setError(values[2].dbError);
      await refreshSync();
    } catch {
      setError("Koneksi terputus. Data belum diperbarui; coba muat ulang.");
    } finally {
      setLoading(false);
    }
  }, [refreshSync]);

  useEffect(() => {
    adminFetch("/api/admin/auth")
      .then((r) => r.json())
      .then((d) => setAuth(d.authenticated ? "ready" : "login"))
      .catch(() => setAuth("login"));
    const expired = () => {
      setAuth("login");
      setNews([]);
      setWorks([]);
      setContacts([]);
      setError("Sesi berakhir. Masuk kembali untuk melanjutkan.");
    };
    const connection = () => setOnline(navigator.onLine);
    connection();
    window.addEventListener("studio-session-expired", expired);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    if (!preview && "serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      window.removeEventListener("studio-session-expired", expired);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, [preview]);

  useEffect(() => {
    if (auth === "ready") load();
  }, [auth, load]);
  useEffect(() => {
    if (auth !== "ready") return;
    const saved = () => {
      refreshSync();
      setToast("Konten tersimpan. Periksa status GitHub di Pengaturan.");
    };
    const focus = () => {
      if (view !== "editor" && view !== "work") load();
    };
    window.addEventListener("studio-saved", saved);
    window.addEventListener("focus", focus);
    const timer = window.setInterval(refreshSync, 30000);
    return () => {
      window.removeEventListener("studio-saved", saved);
      window.removeEventListener("focus", focus);
      clearInterval(timer);
    };
  }, [auth, load, refreshSync, view]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const navigate = (next: View) => {
    if (
      (view === "editor" || view === "work") &&
      next !== view &&
      !window.confirm("Tinggalkan editor? Pastikan perubahan sudah disimpan.")
    )
      return;
    setView(next);
    if (next === "home" || next === "news" || next === "inbox") load();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openEditor = (item: NewsPost | null) => {
    setPost(item);
    setEditorKey((k) => k + 1);
    setView("editor");
  };
  const retry = async () => {
    setBusy(true);
    try {
      const r = await adminFetch("/api/admin/sync", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Sinkronisasi belum berhasil.");
      setSync(data);
      setToast(data.message);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Koneksi gagal.");
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    try {
      const r = await adminFetch("/api/admin/auth", { method: "DELETE" });
      if (!r.ok) throw new Error();
      setAuth("login");
      setNews([]);
      setWorks([]);
      setContacts([]);
      setView("home");
    } catch {
      setError("Belum berhasil keluar. Coba lagi saat koneksi tersedia.");
    }
  };
  const published = news.filter(
    (p) =>
      p.status === "published" &&
      p.published_at &&
      new Date(p.published_at) <= new Date(),
  );
  const drafts = news.filter((p) => p.status === "draft");
  const thumbWorks = [
    ...works.filter((w) => w.is_featured),
    ...works.filter((w) => !w.is_featured),
  ]
    .filter((w) => coverOf(w))
    .slice(0, 3);
  const active =
    view === "editor" ? "news" : view === "comments" ? "inbox" : view;
  const syncOK = sync.status === "synced";

  return (
    <div className={`s-app ${dark ? "s-dark" : ""}`}>
      {auth !== "ready" ? (
        <div className="s-login">
          <div className="s-login-story">
            <div className="s-brand">
              <StudioLogo />
              <span>
                khincc<span className="s-brand-light"> / studio</span>
              </span>
            </div>
            <div>
              <span className="s-eyebrow">YOUR STUDIO, ANYWHERE</span>
              <h1>
                Ruang untuk
                <br />
                ide berikutnya.
              </h1>
              <p>
                Berita, karya, dan percakapan klien.
                <br />
                Satu ruang, di genggaman Anda.
              </p>
            </div>
            <span className="s-small">KHINCC STUDIO · CREATIVE CONTROL</span>
          </div>
          <div className="s-login-form">
            <div className="s-login-card">
              <span className="s-icon-box">
                <Icon name="lock" />
              </span>
              <h2>Selamat datang kembali.</h2>
              <p>Masuk dengan akun admin website Anda.</p>
              {auth === "loading" ? (
                <p role="status">Memeriksa sesi…</p>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError("");
                    const form = new FormData(e.currentTarget);
                    try {
                      const r = await adminFetch("/api/admin/auth", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          username: form.get("username"),
                          password: form.get("password"),
                        }),
                      });
                      const d = await r.json();
                      if (!r.ok) throw new Error(d.error || "Login gagal.");
                      setAuth("ready");
                    } catch (err) {
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Tidak dapat terhubung.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label>
                    Username
                    <input name="username" autoComplete="username" required />
                  </label>
                  <label>
                    Password
                    <input
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </label>
                  {error && (
                    <p className="s-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button className="s-primary" disabled={busy}>
                    {busy ? "Memverifikasi…" : "Masuk ke Studio"}
                    <Icon name="arrow" />
                  </button>
                </form>
              )}
              <a
                href={preview ? "https://khincreator.com" : "/app"}
                className="s-login-back"
              >
                Lihat sebagai pengunjung <Icon name="external" size={15} />
              </a>
            </div>
          </div>
        </div>
      ) : (
        <>
          <aside className="s-sidebar">
            <div className="s-brand">
              <StudioLogo />
              <span>
                khincc<span className="s-brand-light"> / studio</span>
              </span>
            </div>
            <div className="s-workspace">
              <span className="s-workspace-icon">K.</span>
              <div>
                <strong>Khincc Studio</strong>
                <small>Personal workspace</small>
              </div>
              <span className="s-dot" />
            </div>
            <span className="s-nav-label">WORKSPACE</span>
            <nav aria-label="Navigasi Studio">
              {nav.map((n) => (
                <button
                  key={n.key}
                  onClick={() => navigate(n.key)}
                  className={active === n.key ? "active" : ""}
                >
                  <Icon name={n.icon} />
                  <span>{n.label}</span>
                  {n.key === "news" && drafts.length > 0 && (
                    <small>{drafts.length}</small>
                  )}
                </button>
              ))}
            </nav>
            <div className="s-sidebar-bottom">
              <div className="s-pocket">
                <Icon name="phone" />
                <strong>Studio dalam saku.</strong>
                <p>
                  Pasang di iPhone.
                  <br />
                  Bawa ide ke mana saja.
                </p>
                <button onClick={() => setInstall(true)}>
                  Cara memasang <Icon name="arrow" size={16} />
                </button>
              </div>
              <a
                href={preview ? "https://khincreator.com" : "/app"}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="globe" size={18} />
                Lihat website
                <Icon name="external" size={14} />
              </a>
              <button className="s-account" onClick={logout}>
                <span className="s-avatar">K</span>
                <span>
                  <strong>Admin Studio</strong>
                  <small>Keluar dari akun</small>
                </span>
                <Icon name="logout" size={18} />
              </button>
            </div>
          </aside>
          <div className="s-main">
            <header className="s-topbar">
              <div className="s-breadcrumb">
                Workspace <span>/</span>{" "}
                <strong>{nav.find((n) => n.key === active)?.label}</strong>
              </div>
              <div className="s-top-actions">
                <span className={`s-connection ${!online ? "s-warning" : ""}`}>
                  <span className="s-dot" />
                  {online ? "Online" : "Offline"}
                </span>
                <button
                  aria-label={dark ? "Mode terang" : "Mode gelap"}
                  onClick={() => setDark(!dark)}
                >
                  <Icon name={dark ? "sun" : "moon"} size={19} />
                </button>
                <button
                  aria-label="Muat ulang data"
                  disabled={loading || view === "editor" || view === "work"}
                  onClick={load}
                >
                  <Icon name="sync" size={18} />
                </button>
                <span className="s-avatar">K</span>
              </div>
            </header>
            <main className="s-content">
              {preview && (
                <div className="s-demo">
                  <span>PREVIEW INTERAKTIF</span> Data contoh terpisah. Tidak
                  mengubah website atau GitHub.
                </div>
              )}
              {!online && (
                <div className="s-alert" role="status">
                  Anda sedang offline. Penyimpanan memerlukan internet; jangan
                  tutup editor sebelum tersimpan.
                </div>
              )}
              {error && (
                <div className="s-alert" role="alert">
                  {error} <button onClick={load}>Coba lagi</button>
                </div>
              )}
              {view === "home" && (
                <>
                  <div className="s-page-heading">
                    <div>
                      <div className="s-eyebrow">RUANG KREATIF ANDA</div>
                      <h1>
                        Selamat datang di Studio<span>.</span>
                      </h1>
                      <p>Karya baru, cerita baru. Mulai dari sini.</p>
                    </div>
                    <button
                      className="s-primary"
                      onClick={() => openEditor(null)}
                    >
                      <Icon name="plus" size={18} />
                      Tulis berita
                    </button>
                  </div>
                  <div className="s-overview">
                    <section className="s-hero-card">
                      <div className="s-hero-copy">
                        <span className="s-tag">
                          <span className="s-dot" />
                          {preview
                            ? "DEMO WORKSPACE"
                            : dbReady
                              ? "WORKSPACE TERHUBUNG"
                              : "PERIKSA KONFIGURASI"}
                        </span>
                        <h2>
                          Ide Anda.
                          <br />
                          <span>Selalu bergerak.</span>
                        </h2>
                        <p>
                          Kelola cerita dan karya dari mana saja.
                          <br className="s-desktop" /> Website Anda mengikuti
                          setiap langkah.
                        </p>
                        <button onClick={() => navigate("work")}>
                          Kelola portofolio <Icon name="arrow" size={17} />
                        </button>
                      </div>
                      <div className="s-hero-art">
                        <img
                          src="/work/design-down-under-brew.jpg"
                          alt="Karya editorial Down Under Brew dari portofolio Khincc"
                        />
                        <span className="s-art-caption">
                          SELECTED WORK / KHINCC
                        </span>
                      </div>
                    </section>
                    <section className="s-sync-card">
                      <div className="s-section-top">
                        <span className="s-icon-box">
                          <Icon name="sync" />
                        </span>
                        <span className={`s-pill ${syncOK ? "s-good" : ""}`}>
                          {preview
                            ? "Simulasi"
                            : syncOK
                              ? "Tersinkron"
                              : "Perlu perhatian"}
                        </span>
                      </div>
                      <h2>Website ↔ GitHub</h2>
                      <p>{sync.message}</p>
                      <div className="s-sync-path">
                        <span>
                          <Icon name="work" size={15} />
                          Studio
                        </span>
                        <span>→</span>
                        <span>Website</span>
                        <span>→</span>
                        <span>GitHub</span>
                      </div>
                      <div className="s-sync-foot">
                        <small>
                          {sync.last_synced_at
                            ? `Terakhir ${dateLabel(sync.last_synced_at)}`
                            : "Hanya konten terbit"}
                        </small>
                        <button
                          aria-label="Buka pengaturan sinkronisasi"
                          onClick={() => navigate("settings")}
                        >
                          <Icon name="arrow" size={18} />
                        </button>
                      </div>
                    </section>
                  </div>
                  <div className="s-stats">
                    {[
                      {
                        name: "Portofolio",
                        value: works.length,
                        note: `${works.filter((w) => w.is_published).length} ditampilkan di website`,
                        icon: "work",
                        go: "work" as View,
                      },
                      {
                        name: "Berita terbit",
                        value: published.length,
                        note: "Cerita untuk pengunjung",
                        icon: "news",
                        go: "news" as View,
                      },
                      {
                        name: "Draft berita",
                        value: drafts.length,
                        note: "Menunggu sentuhan berikutnya",
                        icon: "news",
                        go: "news" as View,
                      },
                      {
                        name: "Pesan klien",
                        value: contacts.length,
                        note: "Percakapan dari website",
                        icon: "inbox",
                        go: "inbox" as View,
                      },
                    ].map((s) => (
                      <button
                        className="s-stat"
                        key={s.name}
                        onClick={() => navigate(s.go)}
                      >
                        <div>
                          <span>{s.name}</span>
                          <Icon name={s.icon} size={18} />
                        </div>
                        <strong>
                          {loading ? "…" : String(s.value).padStart(2, "0")}
                        </strong>
                        <small>{s.note}</small>
                      </button>
                    ))}
                  </div>
                  <div className="s-lower-grid">
                    <section className="s-panel">
                      <div className="s-panel-heading">
                        <h2>Berita terbaru</h2>
                        <button onClick={() => navigate("news")}>
                          Lihat semua <Icon name="arrow" size={15} />
                        </button>
                      </div>
                      {news.length ? (
                        <div className="s-news-list">
                          {news.slice(0, 4).map((n) => (
                            <button
                              className="s-news-row"
                              key={n.id}
                              onClick={() => openEditor(n)}
                            >
                              <div className="s-news-image">
                                {n.cover_image ? (
                                  <img src={n.cover_image} alt="" />
                                ) : (
                                  <Icon name="news" size={22} />
                                )}
                              </div>
                              <div className="s-news-copy">
                                <strong>{n.title}</strong>
                                <small>
                                  {n.category} <span>·</span>{" "}
                                  {dateLabel(n.updated_at)}
                                </small>
                              </div>
                              <span
                                className={`s-pill ${n.status === "published" ? "s-good" : ""}`}
                              >
                                {n.status === "draft"
                                  ? "Draft"
                                  : n.published_at &&
                                      new Date(n.published_at) > new Date()
                                    ? "Terjadwal"
                                    : "Terbit"}
                              </span>
                              <Icon name="arrow" size={16} />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="s-empty">
                          Belum ada berita. Cerita pertama dimulai dari Anda.
                        </div>
                      )}
                    </section>
                    <section className="s-panel s-quick">
                      <div className="s-panel-heading">
                        <h2>Akses cepat</h2>
                        <span className="s-small">MAKE IT HAPPEN</span>
                      </div>
                      <button onClick={() => openEditor(null)}>
                        <span className="s-icon-box">
                          <Icon name="news" />
                        </span>
                        <span>
                          <strong>Bagikan cerita baru</strong>
                          <small>Tulis, simpan draft, terbitkan.</small>
                        </span>
                        <Icon name="plus" size={18} />
                      </button>
                      <button onClick={() => navigate("work")}>
                        <span className="s-icon-box">
                          <Icon name="work" />
                        </span>
                        <span>
                          <strong>Tampilkan karya terbaik</strong>
                          <small>Tambah dan atur portofolio.</small>
                        </span>
                        <Icon name="plus" size={18} />
                      </button>
                      <button onClick={() => navigate("invoice")}>
                        <span className="s-icon-box">
                          <Icon name="invoice" />
                        </span>
                        <span>
                          <strong>Buat invoice</strong>
                          <small>Isi detail dan unduh PDF.</small>
                        </span>
                        <Icon name="plus" size={18} />
                      </button>
                      <button onClick={() => navigate("comments")}>
                        <span className="s-icon-box">
                          <Icon name="chat" />
                        </span>
                        <span>
                          <strong>Jaga percakapan</strong>
                          <small>Moderasi komentar pengunjung.</small>
                        </span>
                        <Icon name="arrow" size={18} />
                      </button>
                    </section>
                  </div>
                  <section className="s-selected">
                    <div className="s-panel-heading">
                      <h2>Di balik setiap karya.</h2>
                      <button onClick={() => navigate("work")}>
                        Buka portofolio <Icon name="arrow" size={15} />
                      </button>
                    </div>
                    <div className="s-work-grid">
                      {thumbWorks.map((w) => (
                        <button
                          className="s-work-card"
                          key={w.id}
                          onClick={() => navigate("work")}
                        >
                          <img src={coverOf(w)!} alt={w.image_alt || w.title} />
                          <div>
                            <span>{w.kind.toUpperCase()}</span>
                            <strong>{w.title}</strong>
                            <Icon name="external" size={17} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}
              {view === "news" && (
                <div className="s-legacy admin-root">
                  <NewsList
                    posts={news}
                    loading={loading}
                    error={null}
                    onNew={() => openEditor(null)}
                    onEdit={openEditor}
                    onDeleted={(id) =>
                      setNews((n) => n.filter((p) => p.id !== id))
                    }
                  />
                </div>
              )}
              {view === "editor" && (
                <div className="s-legacy admin-root">
                  <NewsEditor
                    key={editorKey}
                    post={post}
                    onSaved={(saved) => {
                      setPost(saved);
                      setNews((n) => [
                        saved,
                        ...n.filter((p) => p.id !== saved.id),
                      ]);
                    }}
                    onCancel={() => {
                      setView("news");
                      load();
                    }}
                  />
                </div>
              )}
              {view === "work" && (
                <div className="s-legacy admin-root">
                  <PortfolioManager />
                </div>
              )}
              {view === "comments" && (
                <div className="s-legacy admin-root">
                  <CommentsList />
                </div>
              )}
              {view === "invoice" && (
                <InvoiceBuilder invoice={invoice} setInvoice={setInvoice} />
              )}
              {view === "inbox" && (
                <>
                  <div className="s-page-heading">
                    <div>
                      <div className="s-eyebrow">PERCAKAPAN BERMAKNA</div>
                      <h1>
                        Inbox klien<span>.</span>
                      </h1>
                      <p>Semua brief dari formulir kontak website Anda.</p>
                    </div>
                    <button
                      className="s-secondary"
                      onClick={() => navigate("comments")}
                    >
                      <Icon name="chat" size={18} />
                      Komentar
                    </button>
                  </div>
                  <label className="s-search">
                    <Icon name="search" size={18} />
                    <input
                      aria-label="Cari pesan"
                      placeholder="Cari nama, email, atau pesan…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <div className="s-messages">
                    {contacts
                      .filter((c) =>
                        `${c.name} ${c.email} ${c.message}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((c) => (
                        <article className="s-panel s-message" key={c.id}>
                          <div className="s-message-head">
                            <span className="s-avatar">
                              {c.name.slice(0, 1)}
                            </span>
                            <div>
                              <h2>{c.name}</h2>
                              <small>{c.email}</small>
                            </div>
                            <small>{dateLabel(c.created_at)}</small>
                          </div>
                          <div className="s-message-tags">
                            <span className="s-pill">
                              {c.project_type || "Project"}
                            </span>
                            {c.budget && (
                              <span className="s-pill">{c.budget}</span>
                            )}
                          </div>
                          <p>{c.message}</p>
                          <a
                            className="s-secondary"
                            href={`mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(`Re: ${c.project_type || "Project"} / Khincc Studio`)}`}
                          >
                            Balas melalui email
                            <Icon name="external" size={15} />
                          </a>
                        </article>
                      ))}
                    {!contacts.filter((c) =>
                      `${c.name} ${c.email} ${c.message}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    ).length && (
                      <div className="s-empty">Tidak ada pesan yang cocok.</div>
                    )}
                  </div>
                </>
              )}
              {view === "settings" && (
                <>
                  <div className="s-page-heading">
                    <div>
                      <div className="s-eyebrow">
                        TERHUBUNG, TETAP TERKENDALI
                      </div>
                      <h1>
                        Pengaturan Studio<span>.</span>
                      </h1>
                      <p>Koneksi, instalasi, dan keamanan workspace Anda.</p>
                    </div>
                  </div>
                  <div className="s-settings-grid">
                    <section className="s-panel s-settings-card">
                      <span className="s-icon-box">
                        <Icon name="sync" />
                      </span>
                      <h2>Sinkronisasi GitHub</h2>
                      <p>
                        Konten terbit disalin ke{" "}
                        <code>content/published.json</code>. Draft, pesan klien,
                        dan komentar tidak dikirim ke repositori publik.
                      </p>
                      <div className="s-status-detail">
                        <span className={`s-pill ${syncOK ? "s-good" : ""}`}>
                          {preview ? "Simulasi" : sync.status}
                        </span>
                        <p>{sync.message}</p>
                        {sync.last_synced_at && (
                          <small>
                            Sinkronisasi terakhir:{" "}
                            {new Date(sync.last_synced_at).toLocaleString(
                              "id-ID",
                            )}
                          </small>
                        )}
                      </div>
                      <button
                        className="s-primary"
                        disabled={busy || !online}
                        onClick={retry}
                      >
                        <Icon name="sync" size={18} />
                        {busy ? "Menyinkronkan…" : "Coba sinkronkan"}
                      </button>
                      {sync.commit_url && (
                        <a
                          className="s-text-link"
                          href={sync.commit_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Lihat commit terakhir{" "}
                          <Icon name="external" size={15} />
                        </a>
                      )}
                      <small>
                        Website tetap memakai Supabase. GitHub adalah arsip satu
                        arah, bukan database utama.
                      </small>
                    </section>
                    <section className="s-panel s-settings-card">
                      <span className="s-icon-box">
                        <Icon name="phone" />
                      </span>
                      <h2>Pasang di iPhone</h2>
                      <p>
                        Tambahkan Studio ke Home Screen untuk membuka dashboard
                        dalam tampilan aplikasi.
                      </p>
                      <ol>
                        <li>
                          Buka <strong>khincreator.com/studio</strong> di
                          Safari.
                        </li>
                        <li>Ketuk tombol Bagikan.</li>
                        <li>Pilih Tambahkan ke Layar Utama.</li>
                        <li>Aktifkan Buka sebagai App Web, lalu Tambah.</li>
                      </ol>
                      <button
                        className="s-secondary"
                        onClick={() => setInstall(true)}
                      >
                        Lihat panduan <Icon name="arrow" size={16} />
                      </button>
                      <small>
                        Instalasi tersedia setelah versi ini dipasang di domain
                        website.
                      </small>
                    </section>
                    <section className="s-panel s-settings-card">
                      <span className="s-icon-box">
                        <Icon name="lock" />
                      </span>
                      <h2>Privasi & akses</h2>
                      <p>
                        Login memakai akun admin website. Data pribadi tidak
                        disimpan di cache offline dan tidak masuk ke GitHub.
                      </p>
                      <button className="s-secondary" onClick={logout}>
                        Keluar dari Studio <Icon name="logout" size={17} />
                      </button>
                    </section>
                    <section className="s-panel s-settings-card">
                      <span className="s-icon-box">
                        <Icon name="globe" />
                      </span>
                      <h2>Area pengunjung</h2>
                      <p>
                        Pengunjung dapat melihat berita dan portofolio terbaru
                        tanpa akses ke dashboard admin. Feed dimuat ulang saat
                        aplikasi kembali aktif.
                      </p>
                      <a
                        className="s-secondary"
                        href={preview ? "?public=1" : "/app"}
                      >
                        Buka aplikasi publik <Icon name="external" size={16} />
                      </a>
                      <small>
                        Pembaruan dalam aplikasi, bukan notifikasi push.
                      </small>
                    </section>
                  </div>
                </>
              )}
              <footer className="s-footer">
                <span>KHINCC STUDIO</span>
                <span>Ruang kecil. Kemungkinan besar.</span>
                <span>Made for your next idea.</span>
              </footer>
            </main>
          </div>
          <nav className="s-bottom-nav" aria-label="Navigasi iPhone">
            {nav.map((n) => (
              <button
                key={n.key}
                onClick={() => navigate(n.key)}
                className={active === n.key ? "active" : ""}
              >
                <Icon name={n.icon} size={21} />
                <span>{n.label}</span>
              </button>
            ))}
          </nav>
        </>
      )}
      {install && (
        <div className="s-modal-backdrop" onClick={() => setInstall(false)}>
          <section
            className="s-install-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Pasang di iPhone"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="s-modal-close"
              aria-label="Tutup panduan"
              onClick={() => setInstall(false)}
              autoFocus
            >
              <Icon name="close" />
            </button>
            <span className="s-icon-box">
              <Icon name="phone" size={24} />
            </span>
            <h2>Studio. Satu ketukan.</h2>
            <p>
              Setelah deployment, buka <strong>khincreator.com/studio</strong>{" "}
              langsung di Safari, bukan di preview ini.
            </p>
            <ol>
              <li>
                Ketuk <strong>Bagikan</strong> di Safari.
              </li>
              <li>
                Pilih <strong>Tambahkan ke Layar Utama</strong>.
              </li>
              <li>
                Aktifkan <strong>Buka sebagai App Web</strong>, lalu ketuk{" "}
                <strong>Tambah</strong>.
              </li>
            </ol>
            <p>
              Untuk pengunjung, gunakan alamat <strong>/app</strong>.
            </p>
            <button className="s-primary" onClick={() => setInstall(false)}>
              Mengerti <Icon name="check" size={17} />
            </button>
          </section>
        </div>
      )}
      {toast && (
        <div className="s-toast" role="status">
          <Icon name="check" size={17} />
          {toast}
          <button aria-label="Tutup pesan" onClick={() => setToast("")}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
