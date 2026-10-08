import { describe, expect, it } from "vitest";
import {
  buildInvoicePdf,
  createInvoice,
  formatRupiah,
  invoiceIssues,
  invoiceTotals,
  type Invoice,
} from "@/lib/invoice";
import { textWidth, toPdfText, wrapText } from "@/lib/pdf-writer";

const toText = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => String.fromCharCode(b)).join("");

function filledInvoice(overrides: Partial<Invoice> = {}): Invoice {
  const base = createInvoice(new Date(2026, 9, 8));
  return {
    ...base,
    to: { ...base.to, name: "Klien Contoh", email: "klien@example.com" },
    items: [
      { id: "a", description: "Desain logo", qty: 1, price: 1500000 },
      { id: "b", description: "Revisi (2x)", qty: 2, price: 250000 },
    ],
    taxPercent: 11,
    payment: "Bank BCA 1234567890\na.n. Khincc",
    notes: "Terima kasih.",
    ...overrides,
  };
}

describe("Invoice totals and formatting", () => {
  it("menghitung subtotal, PPN, dan total dengan pembulatan rupiah", () => {
    const invoice = filledInvoice();
    expect(invoiceTotals(invoice)).toEqual({
      subtotal: 2000000,
      tax: 220000,
      total: 2220000,
    });
  });

  it("memformat rupiah dengan titik pemisah ribuan", () => {
    expect(formatRupiah(2220000)).toBe("Rp 2.220.000");
    expect(formatRupiah(0)).toBe("Rp 0");
    expect(formatRupiah(999)).toBe("Rp 999");
  });

  it("menolak invoice tanpa klien atau item yang terisi", () => {
    const invoice = createInvoice(new Date(2026, 9, 8));
    const issues = invoiceIssues(invoice);
    expect(issues).toContain("Nama klien belum diisi.");
    expect(issues).toContain("Tambahkan minimal satu item.");
    expect(invoiceIssues(filledInvoice())).toEqual([]);
  });
});

describe("PDF text helpers", () => {
  it("mengganti karakter di luar ASCII agar font bawaan tetap aman", () => {
    expect(toPdfText("Café ✓")).toBe("Cafe ?");
  });

  it("memotong teks panjang menjadi beberapa baris sesuai lebar", () => {
    const lines = wrapText(
      "Desain identitas visual lengkap termasuk logo, warna, dan tipografi",
      10,
      120,
    );
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(textWidth(line, 10)).toBeLessThanOrEqual(120);
    }
  });
});

describe("buildInvoicePdf", () => {
  it("menghasilkan berkas PDF dengan tabel xref yang menunjuk ke objek yang benar", () => {
    const text = toText(buildInvoicePdf(filledInvoice()));

    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);

    const startxref = Number(/startxref\n(\d+)\n/.exec(text)?.[1]);
    expect(text.slice(startxref, startxref + 4)).toBe("xref");

    const xrefBody = text.slice(startxref).split("\n");
    const count = Number(xrefBody[1].split(" ")[1]);
    for (let i = 1; i < count; i++) {
      const offset = Number(xrefBody[2 + i].slice(0, 10));
      expect(text.slice(offset, offset + 10)).toMatch(new RegExp(`^${i} 0 obj`));
    }
  });

  it("menuliskan nomor, klien, dan total ke dalam aliran teks", () => {
    const text = toText(buildInvoicePdf(filledInvoice()));
    expect(text).toContain("(INV-20261008-001) Tj");
    expect(text).toContain("(Klien Contoh) Tj");
    expect(text).toContain("(Rp 2.220.000) Tj");
  });

  it("tetap membuat PDF valid ketika item sangat banyak sehingga berpindah halaman", () => {
    const items = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      description: `Item nomor ${i + 1} dengan deskripsi yang cukup panjang untuk dibungkus`,
      qty: 1,
      price: 100000,
    }));
    const text = toText(buildInvoicePdf(filledInvoice({ items })));
    expect(text).toMatch(/\/Count [2-9]/);
    expect(text).toContain("/Type /Page /Parent");
  });

  it("mengandung karakter kurung di teks tanpa merusak string PDF", () => {
    const text = toText(
      buildInvoicePdf(filledInvoice({ notes: "Catatan (penting) \\ tanda" })),
    );
    expect(text).toContain("(Catatan \\(penting\\) \\\\ tanda) Tj");
  });
});
