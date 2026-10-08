"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/StudioIcon";
import { adminFetch } from "@/lib/admin-fetch";
import { formatRupiah } from "@/lib/invoice";
import type { Product, ProductInput, ProductStatus } from "@/lib/products";

// Isi form berupa teks, supaya kolom harga bisa dikosongkan saat mengetik
type FormState = {
  title: string;
  slug: string;
  description: string;
  price: string;
  image: string;
  image_alt: string;
  status: ProductStatus;
};

const emptyForm: FormState = {
  title: "",
  slug: "",
  description: "",
  price: "",
  image: "",
  image_alt: "",
  status: "draft",
};

const toForm = (p: Product): FormState => ({
  title: p.title,
  slug: p.slug,
  description: p.description ?? "",
  price: String(p.price),
  image: p.image ?? "",
  image_alt: p.image_alt ?? "",
  status: p.status,
});

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // null = daftar, "new" = produk baru, angka = id produk yang sedang diedit
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await adminFetch("/api/admin/products");
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Produk belum dapat dimuat.");
      setProducts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Koneksi terputus. Coba muat ulang.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = (item: Product | null) => {
    setEditing(item ? item.id : "new");
    setForm(item ? toForm(item) : emptyForm);
    setFormError("");
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const upload = async (file: File) => {
    setFormError("");
    const body = new FormData();
    body.append("file", file);
    try {
      const r = await adminFetch("/api/admin/upload", { method: "POST", body });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Gambar belum berhasil diunggah.");
      set("image", data.url);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Gambar belum berhasil diunggah.");
    }
  };

  const save = async () => {
    const price = form.price.trim() === "" ? NaN : Number(form.price);
    const payload: ProductInput = {
      title: form.title,
      slug: form.slug,
      description: form.description,
      price,
      image: form.image,
      image_alt: form.image_alt,
      status: form.status,
    };
    setBusy(true);
    setFormError("");
    try {
      const isNew = editing === "new";
      const r = await adminFetch(isNew ? "/api/admin/products" : `/api/admin/products/${editing}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Produk belum berhasil disimpan.");
      setEditing(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Produk belum berhasil disimpan.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: Product) => {
    if (!window.confirm(`Hapus produk "${item.title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    try {
      const r = await adminFetch(`/api/admin/products/${item.id}`, { method: "DELETE" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Produk belum berhasil dihapus.");
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Produk belum berhasil dihapus.");
    } finally {
      setBusy(false);
    }
  };

  if (editing !== null) {
    const isNew = editing === "new";
    const current = products.find((p) => p.id === editing);
    return (
      <>
        <div className="s-page-heading">
          <div>
            <div className="s-eyebrow">TOKO</div>
            <h1>
              {isNew ? "Produk baru" : "Ubah produk"}
              <span>.</span>
            </h1>
          </div>
          <button className="s-secondary" onClick={() => setEditing(null)} disabled={busy}>
            Batal
          </button>
        </div>

        <div className="s-invoice-form">
          <section className="s-panel s-invoice-card">
            <div className="s-invoice-grid">
              <label className="s-invoice-wide">
                Nama produk
                <input value={form.title} onChange={(e) => set("title", e.target.value)} />
              </label>
              <label>
                Alamat halaman (slug)
                <input
                  value={form.slug}
                  placeholder={isNew ? "Dibuat otomatis dari nama" : ""}
                  onChange={(e) => set("slug", e.target.value.toLowerCase())}
                />
              </label>
              <label>
                Harga (Rp)
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                />
              </label>
              <label className="s-invoice-wide">
                Deskripsi
                <textarea
                  rows={5}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </label>
              <label>
                Status
                <select value={form.status} onChange={(e) => set("status", e.target.value as ProductStatus)}>
                  <option value="draft">Draft (tidak tampil)</option>
                  <option value="published">Terbit (tampil di /toko)</option>
                </select>
              </label>
              <label>
                Teks alternatif gambar
                <input value={form.image_alt} onChange={(e) => set("image_alt", e.target.value)} />
              </label>
              <div className="s-invoice-wide s-product-image">
                <span>Gambar produk</span>
                {form.image && <img src={form.image} alt="" />}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload(file);
                    e.target.value = "";
                  }}
                />
                {form.image && (
                  <button className="s-text-link" type="button" onClick={() => set("image", "")}>
                    Hapus gambar
                  </button>
                )}
              </div>
            </div>
          </section>

          {formError && (
            <p className="s-alert" role="alert">
              {formError}
            </p>
          )}

          <div className="s-product-actions">
            {!isNew && (
              <button className="s-secondary" onClick={() => current && remove(current)} disabled={busy || !current}>
                Hapus produk
              </button>
            )}
            <button className="s-primary" onClick={save} disabled={busy || !form.title.trim() || form.price.trim() === ""}>
              {busy ? "Menyimpan…" : "Simpan produk"}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="s-page-heading">
        <div>
          <div className="s-eyebrow">TOKO</div>
          <h1>
            Produk<span>.</span>
          </h1>
          <p>Produk yang berstatus terbit tampil di halaman /toko dan bisa dipesan lewat WhatsApp.</p>
        </div>
        <button className="s-primary" onClick={() => open(null)}>
          <Icon name="plus" size={18} />
          Produk baru
        </button>
      </div>

      {error && (
        <p className="s-alert" role="alert">
          {error}
        </p>
      )}

      <section className="s-panel">
        {loading ? (
          <div className="s-empty">Memuat produk…</div>
        ) : products.length === 0 ? (
          <div className="s-empty">Belum ada produk. Tambahkan produk pertama Anda.</div>
        ) : (
          <div className="s-news-list">
          {products.map((p) => (
            <button className="s-news-row" key={p.id} onClick={() => open(p)}>
              <div className="s-news-image">{p.image ? <img src={p.image} alt="" /> : <Icon name="store" size={22} />}</div>
              <div className="s-news-copy">
                <strong>{p.title}</strong>
                <small>
                  {formatRupiah(p.price)} <span>·</span> /toko/{p.slug}
                </small>
              </div>
              <span className={`s-pill ${p.status === "published" ? "s-good" : ""}`}>
                {p.status === "published" ? "Terbit" : "Draft"}
              </span>
              <Icon name="arrow" size={16} />
            </button>
          ))}
          </div>
        )}
      </section>
    </>
  );
}
