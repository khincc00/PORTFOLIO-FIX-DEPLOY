import { PdfDocument, PAGE, wrapText } from "./pdf-writer";

export const MAX_INVOICE_ITEMS = 30;

export type InvoiceItem = {
  id: string;
  description: string;
  qty: number;
  price: number; // dalam rupiah, bilangan bulat
};

export type InvoiceParty = {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
};

export type Invoice = {
  number: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  from: InvoiceParty;
  to: InvoiceParty;
  items: InvoiceItem[];
  taxPercent: number;
  payment: string;
  notes: string;
};

const pad = (n: number) => String(n).padStart(2, "0");

const isoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function newItemId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createInvoice(now = new Date()): Invoice {
  const due = new Date(now);
  due.setDate(due.getDate() + 14);
  return {
    number: `INV-${isoDate(now).replace(/-/g, "")}-001`,
    issueDate: isoDate(now),
    dueDate: isoDate(due),
    from: { name: "Khincc Studio", company: "", email: "", phone: "", address: "" },
    to: { name: "", company: "", email: "", phone: "", address: "" },
    items: [{ id: newItemId(), description: "", qty: 1, price: 0 }],
    taxPercent: 0,
    payment: "",
    notes: "",
  };
}

export function itemAmount(item: InvoiceItem): number {
  return Math.round(item.qty * item.price);
}

export function invoiceTotals(invoice: Invoice) {
  const subtotal = invoice.items.reduce((sum, item) => sum + itemAmount(item), 0);
  const tax = Math.round((subtotal * invoice.taxPercent) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

export function formatRupiah(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = String(Math.round(Math.abs(value)));
  return `${sign}Rp ${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function formatDateID(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

// Daftar masalah yang membuat PDF belum layak diunduh. Kosong berarti siap.
export function invoiceIssues(invoice: Invoice): string[] {
  const issues: string[] = [];
  if (!invoice.number.trim()) issues.push("Nomor invoice belum diisi.");
  if (!invoice.issueDate) issues.push("Tanggal terbit belum diisi.");
  if (!invoice.from.name.trim()) issues.push("Nama penerbit belum diisi.");
  if (!invoice.to.name.trim()) issues.push("Nama klien belum diisi.");
  const filled = invoice.items.filter((item) => item.description.trim());
  if (filled.length === 0) issues.push("Tambahkan minimal satu item.");
  if (invoice.items.some((item) => item.qty <= 0 || item.price < 0))
    issues.push("Qty harus lebih dari 0 dan harga tidak boleh negatif.");
  if (invoice.taxPercent < 0 || invoice.taxPercent > 100)
    issues.push("PPN harus antara 0 dan 100 persen.");
  return issues;
}

export function invoiceFileName(invoice: Invoice): string {
  const safe = invoice.number.trim().replace(/[^A-Za-z0-9-]+/g, "-") || "draft";
  return `${safe}.pdf`;
}

// Tata letak invoice A4. Semua koordinat dalam poin, dihitung dari atas halaman.
export function buildInvoicePdf(invoice: Invoice): Uint8Array<ArrayBuffer> {
  const doc = new PdfDocument();
  const margin = 48;
  const right = PAGE.width - margin;
  const bottom = PAGE.height - 70;
  const gray = { muted: 0.45 };
  const cols = { no: margin, desc: 84, descWidth: 280, qty: 398, price: 478, amount: right };
  let y = 0;

  const footer = () => {
    doc.text(margin, PAGE.height - 36, `${invoice.number} | ${invoice.from.name}`, {
      size: 8,
      gray: gray.muted,
    });
  };

  const tableHeader = () => {
    doc.rect(margin, y - 12, right - margin, 20);
    doc.text(cols.no, y, "No", { size: 8, bold: true, gray: gray.muted });
    doc.text(cols.desc, y, "DESKRIPSI", { size: 8, bold: true, gray: gray.muted });
    doc.text(cols.qty, y, "QTY", { size: 8, bold: true, gray: gray.muted, align: "right" });
    doc.text(cols.price, y, "HARGA", { size: 8, bold: true, gray: gray.muted, align: "right" });
    doc.text(cols.amount, y, "JUMLAH", { size: 8, bold: true, gray: gray.muted, align: "right" });
    y += 22;
  };

  const newPage = () => {
    footer();
    doc.addPage();
    y = margin + 30;
  };

  // Pindah ke halaman baru bila sisa ruang tidak cukup. Header tabel ikut diulang bila perlu.
  const ensure = (height: number, repeatHeader = false) => {
    if (y + height <= bottom) return;
    newPage();
    if (repeatHeader) tableHeader();
  };

  doc.text(margin, 70, "INVOICE", { size: 26, bold: true });
  doc.text(margin, 94, invoice.number, { size: 10, bold: true });
  doc.text(margin, 110, `Tanggal terbit: ${formatDateID(invoice.issueDate)}`, { size: 9, gray: gray.muted });
  if (invoice.dueDate)
    doc.text(margin, 124, `Jatuh tempo: ${formatDateID(invoice.dueDate)}`, { size: 9, gray: gray.muted });

  // Nama ditebalkan, baris lain biasa. Setiap baris dipotong agar tidak melewati kolom.
  const partyBlock = (x: number, label: string, party: InvoiceParty, top: number) => {
    let py = top;
    doc.text(x, py, label, { size: 8, bold: true, gray: gray.muted });
    py += 16;
    if (party.name.trim()) {
      doc.text(x, py, party.name.trim(), { size: 10, bold: true });
      py += 14;
    }
    const rest = [party.company, party.address, party.email, party.phone]
      .filter((v) => v && v.trim())
      .flatMap((v) => wrapText(v, 10, 210));
    for (const line of rest) {
      doc.text(x, py, line, { size: 10 });
      py += 14;
    }
    return py;
  };
  const fromEnd = partyBlock(margin, "DARI", invoice.from, 160);
  const toEnd = partyBlock(331, "KEPADA", invoice.to, 160);
  y = Math.max(fromEnd, toEnd) + 26;

  tableHeader();
  if (invoice.items.length === 0) {
    doc.text(cols.desc, y, "Belum ada item.", { size: 10, gray: gray.muted });
    y += 20;
  }
  invoice.items.forEach((item, index) => {
    const descLines = wrapText(item.description || "-", 10, cols.descWidth);
    const rowHeight = descLines.length * 13 + 10;
    ensure(rowHeight, true);
    doc.text(cols.no, y, String(index + 1), { size: 10 });
    descLines.forEach((line, i) => doc.text(cols.desc, y + i * 13, line, { size: 10 }));
    doc.text(cols.qty, y, String(item.qty), { size: 10, align: "right" });
    doc.text(cols.price, y, formatRupiah(item.price), { size: 10, align: "right" });
    doc.text(cols.amount, y, formatRupiah(itemAmount(item)), { size: 10, align: "right" });
    y += rowHeight;
    doc.line(margin, y - 6, right, y - 6);
  });

  const { subtotal, tax, total } = invoiceTotals(invoice);
  y += 8;
  ensure(120);
  const labelX = 340;
  const totalRow = (label: string, value: string, size = 10) => {
    doc.text(labelX, y, label, { size, gray: size > 10 ? 0 : gray.muted });
    doc.text(right, y, value, { size, align: "right" });
    y += size > 10 ? 22 : 16;
  };
  totalRow("Subtotal", formatRupiah(subtotal));
  if (invoice.taxPercent > 0)
    totalRow(`PPN ${invoice.taxPercent}%`, formatRupiah(tax));
  doc.line(labelX, y - 4, right, y - 4, { gray: 0.3, width: 0.8 });
  y += 6;
  totalRow("Total", formatRupiah(total), 13);

  const block = (heading: string, body: string) => {
    if (!body.trim()) return;
    const lines = wrapText(body, 9, 300);
    ensure(lines.length * 12 + 30);
    y += 22;
    doc.text(margin, y, heading, { size: 8, bold: true, gray: gray.muted });
    y += 14;
    for (const line of lines) {
      doc.text(margin, y, line, { size: 9 });
      y += 12;
    }
  };
  block("PEMBAYARAN", invoice.payment);
  block("CATATAN", invoice.notes);

  footer();
  return doc.toBytes();
}
