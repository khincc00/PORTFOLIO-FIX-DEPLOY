"use client";
import { useCallback, useEffect, useState } from "react";
import { Icon, StudioLogo } from "@/components/StudioIcon";
import { coverOf, type PortfolioItem } from "@/lib/portfolio-items";
import type { NewsSummary } from "@/lib/news";
import "@/app/studio/studio.css";
import "./pocket.css";

export default function PublicApp({ preview = false }: { preview?: boolean }) {
  const [tab, setTab] = useState<"all" | "news" | "work">("all");
  const [news, setNews] = useState<NewsSummary[]>([]);
  const [works, setWorks] = useState<PortfolioItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(false);
  const [install, setInstall] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/studio/feed", { cache: "no-store" });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setNews(d.news);
      setWorks(d.portfolio);
    } catch {
      setError(
        "Belum dapat memuat pembaruan. Periksa internet lalu coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    const active = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = setInterval(active, 60000);
    document.addEventListener("visibilitychange", active);
    window.addEventListener("online", refresh);
    if (!preview && "serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", active);
      window.removeEventListener("online", refresh);
    };
  }, [preview, refresh]);

  return (
    <div className={`s-app p-app ${dark ? "s-dark" : ""}`}>
      <div className="p-shell">
        <header className="p-header">
          <a href={preview ? "?" : "/app"} className="s-brand">
            <StudioLogo />
            <span>
              khincc<span className="s-brand-light"> / pocket</span>
            </span>
          </a>
          <div>
            <button
              aria-label={dark ? "Mode terang" : "Mode gelap"}
              onClick={() => setDark(!dark)}
            >
              <Icon name={dark ? "sun" : "moon"} />
            </button>
            <button
              aria-label="Muat ulang"
              onClick={refresh}
              disabled={loading}
            >
              <Icon name="sync" />
            </button>
          </div>
        </header>
        {preview && (
          <div className="s-demo">
            <span>PREVIEW</span>Data contoh, bukan pembaruan website live.
          </div>
        )}
        <section className="p-welcome">
          <span className="s-eyebrow">CATATAN DARI STUDIO</span>
          <h1>
            Karya & cerita.
            <br />
            <span>Lebih dekat.</span>
          </h1>
          <p>
            Ide yang tumbuh, karya yang bergerak.
            <br />
            Ikuti kabar terbaru dari Khincc Studio.
          </p>
          <button className="s-secondary" onClick={() => setInstall(!install)}>
            <Icon name="phone" size={17} />
            Simpan di iPhone
            <Icon name="plus" size={16} />
          </button>
        </section>
        {install && (
          <div className="s-alert">
            Buka khincreator.com/app di Safari setelah deployment. Ketuk Bagikan
            → Tambahkan ke Layar Utama → Buka sebagai App Web → Tambah.
          </div>
        )}
        <nav className="p-tabs" aria-label="Filter pembaruan">
          {(
            [
              ["all", "Semua"],
              ["news", "Berita"],
              ["work", "Portofolio"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
          <span>{loading ? "Memuat…" : "Diperbarui saat dibuka"}</span>
        </nav>
        {error && (
          <div className="s-alert" role="alert">
            {error}
            <button onClick={refresh}>Coba lagi</button>
          </div>
        )}
        {tab !== "work" && (
          <section className="p-section">
            <div className="s-panel-heading">
              <h2>Cerita terbaru</h2>
              <Icon name="news" size={17} />
            </div>
            {news.length ? (
              <div className="p-news">
                {news.map((n) => (
                  <a
                    href={`/berita/${n.slug}`}
                    key={n.id}
                    className="s-panel p-news-card"
                  >
                    {n.cover_image && <img src={n.cover_image} alt="" />}
                    <div>
                      <span className="s-eyebrow">
                        {n.category || "Update"}
                      </span>
                      <h3>{n.title}</h3>
                      <p>{n.excerpt}</p>
                      <span className="p-read">
                        {n.published_at &&
                          new Date(n.published_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        <Icon name="arrow" size={17} />
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="s-empty">
                {loading ? "Memuat cerita…" : "Cerita baru akan hadir di sini."}
              </div>
            )}
          </section>
        )}
        {tab !== "news" && (
          <section className="p-section">
            <div className="s-panel-heading">
              <h2>Dari meja kreatif</h2>
              <span className="s-pill">{works.length} karya</span>
            </div>
            <div className="p-works">
              {works.map((w) => (
                <a
                  key={w.id}
                  href={
                    w.link ||
                    (preview ? "https://khincreator.com/work" : "/work")
                  }
                  target={w.link ? "_blank" : undefined}
                  rel={w.link ? "noreferrer" : undefined}
                  className="s-work-card"
                >
                  {coverOf(w) ? (
                    <img
                      src={coverOf(w)!}
                      alt={w.image_alt || w.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="p-no-image">
                      <Icon
                        name={w.kind === "web" ? "globe" : "work"}
                        size={32}
                      />
                    </div>
                  )}
                  <div>
                    <span>{w.kind}</span>
                    <strong>{w.title_id || w.title}</strong>
                    <Icon name="external" size={17} />
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
        <section className="p-contact">
          <span className="s-eyebrow">LET&apos;S MAKE SOMETHING GOOD</span>
          <h2>Punya cerita berikutnya?</h2>
          <a className="s-primary" href="https://khincreator.com/#contact">
            Mari berkolaborasi
            <Icon name="arrow" size={17} />
          </a>
        </section>
        <footer className="s-footer">
          <span>KHINCC STUDIO</span>
          <a href={preview ? "?" : "/studio"}>Masuk ke Studio</a>
        </footer>
      </div>
    </div>
  );
}
