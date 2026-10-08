import { describe, expect, it } from "vitest";
import { parseProductInput, slugify, whatsappOrderUrl } from "@/lib/products";

describe("slugify", () => {
  it("membuat alamat dari judul dan membuang huruf beraksen", () => {
    expect(slugify("Preset Foto Gelap!")).toBe("preset-foto-gelap");
    expect(slugify("  Café  Lampu  ")).toBe("cafe-lampu");
  });
});

describe("parseProductInput", () => {
  const valid = { title: "Preset Foto", price: 25000, status: "published" };

  it("menerima data lengkap dan membuat slug otomatis", () => {
    const result = parseProductInput(valid);
    expect(result).toEqual({
      ok: true,
      value: {
        slug: "preset-foto",
        title: "Preset Foto",
        description: "",
        price: 25000,
        image: "",
        image_alt: "",
        status: "published",
      },
    });
  });

  it("menolak nama kosong, harga desimal atau negatif, dan alamat gambar yang salah", () => {
    expect(parseProductInput({ ...valid, title: "  " })).toMatchObject({ ok: false });
    expect(parseProductInput({ ...valid, price: 12.5 })).toMatchObject({ ok: false });
    expect(parseProductInput({ ...valid, price: -1 })).toMatchObject({ ok: false });
    expect(parseProductInput({ ...valid, image: "javascript:alert(1)" })).toMatchObject({ ok: false });
  });

  it("menjadikan status selain published sebagai draft", () => {
    const result = parseProductInput({ ...valid, status: "hapus" });
    expect(result.ok && result.value.status).toBe("draft");
  });

  it("menolak slug yang tidak valid", () => {
    expect(parseProductInput({ ...valid, slug: "Huruf Besar" })).toMatchObject({ ok: false });
  });
});

describe("whatsappOrderUrl", () => {
  it("menyusun tautan wa.me dengan pesan yang sudah ter-encode", () => {
    const url = whatsappOrderUrl("6281234567890", { title: "Preset Foto", price: 25000 });
    expect(url.startsWith("https://wa.me/6281234567890?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toContain('"Preset Foto" (Rp 25.000)');
  });
});
