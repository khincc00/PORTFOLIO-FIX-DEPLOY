import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  groupProductsByCategory,
  parseProductInput,
  productHref,
  UNCATEGORIZED_LABEL,
} from "@/lib/products";

const base = { title: "Mic USB Podcast", price: 250000 };

describe("Produk: kategori dan link afiliasi", () => {
  it("menerima kategori dan link afiliasi https, lalu merapikan spasinya", () => {
    const r = parseProductInput({ ...base, category: "  Mikrofon & Audio ", affiliate_url: "https://shop.tiktok.com/view/product/1?region=ID" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.category).toBe("Mikrofon & Audio");
      expect(r.value.affiliate_url).toBe("https://shop.tiktok.com/view/product/1?region=ID");
    }
  });
  it("kategori dan link kosong disimpan sebagai null", () => {
    const r = parseProductInput({ ...base, category: "   ", affiliate_url: "" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.category).toBeNull();
      expect(r.value.affiliate_url).toBeNull();
    }
  });
  it("menolak kategori lebih dari 60 karakter", () => {
    const r = parseProductInput({ ...base, category: "x".repeat(61) });
    expect(r).toEqual({ ok: false, error: "Kategori maksimal 60 karakter." });
  });
  it("menolak link afiliasi yang bukan https, mengandung spasi, atau berisi skrip", () => {
    for (const bad of ["http://shop.tiktok.com/x", "shop.tiktok.com/x", "javascript:alert(1)", "https://a.com/b c"]) {
      const r = parseProductInput({ ...base, affiliate_url: bad });
      expect(r.ok, bad).toBe(false);
      if (!r.ok) expect(r.error).toBe("Link afiliasi harus diawali https:// dan tidak boleh mengandung spasi.");
    }
  });
  it("productHref mengembalikan link afiliasi, atau null kalau kosong", () => {
    expect(productHref({ affiliate_url: "https://shop.tiktok.com/view/product/1" })).toBe("https://shop.tiktok.com/view/product/1");
    expect(productHref({ affiliate_url: null })).toBeNull();
  });
});

describe("Produk: pengelompokan per kategori", () => {
  const p = (id: number, category: string | null) => ({ id, category });
  it("mengelompokkan dengan urutan kemunculan pertama dan produk tanpa kategori ke 'Lainnya'", () => {
    const groups = groupProductsByCategory([p(1, "Lighting"), p(2, null), p(3, "Mikrofon"), p(4, "Lighting"), p(5, "  "), p(6, "Lighting")]);
    expect(groups.map((g) => g.label)).toEqual(["Lighting", UNCATEGORIZED_LABEL, "Mikrofon"]);
    expect(groups[0].items.map((x) => x.id)).toEqual([1, 4, 6]);
    expect(groups[1].items.map((x) => x.id)).toEqual([2, 5]);
  });
  it("daftar kosong menghasilkan tanpa kelompok", () => {
    expect(groupProductsByCategory([])).toEqual([]);
  });
});

describe("Produk: migration dan seed di database", () => {
  it("migration lalu seed berjalan, menghasilkan 124 produk dengan kategori dan link", async () => {
    const db = new PGlite();
    await db.exec("create role anon; create role authenticated; create role service_role;");
    await db.exec(await readFile("supabase/migrations/20261008_products.sql", "utf8"));
    await db.exec(await readFile("supabase/migrations/20261019_product_category_affiliate.sql", "utf8"));
    const seed = await readFile("supabase/seed/produk_seed.sql", "utf8");
    await db.exec(seed);
    await db.exec(seed); // diulang: tidak boleh menggandakan data

    const count = async (where = "true") =>
      Number((await db.query<{ n: string }>(`select count(*) n from public.products where ${where}`)).rows[0].n);
    expect(await count()).toBe(124);
    expect(await count("status = 'published'")).toBeGreaterThan(0);
    expect(await count("category is null")).toBe(0);
    expect(await count("affiliate_url is null")).toBe(0);
    expect(await count("affiliate_url not like 'https://shop.tiktok.com/view/product/%'")).toBe(0);
    expect(await count("image not like '/produk/%.jpeg'")).toBe(0);

    const cats = await db.query<{ category: string }>("select distinct category from public.products order by 1");
    expect(cats.rows.map((r) => r.category)).toContain("Headset & Earphone");
    await db.close();
  }, 60000);
});
