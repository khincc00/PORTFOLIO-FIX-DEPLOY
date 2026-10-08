// Penulis PDF minimal tanpa dependensi: teks dan garis dengan font Helvetica bawaan.
// Koordinat ditulis dari atas kiri halaman (y = jarak dari atas), lalu dikonversi ke sistem PDF.

export const PAGE = { width: 595.28, height: 841.89 }; // A4 dalam poin

// Lebar glyph Helvetica (AFM) untuk karakter ASCII 32–126. Dipakai untuk rata kanan dan pemotongan baris.
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
  334, 260, 334, 584,
];
const FALLBACK_WIDTH = 556;

// Hanya ASCII yang aman untuk font bawaan. Huruf beraksen diratakan (é → e), sisanya menjadi "?".
export function toPdfText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\t\r]/g, " ")
    .replace(/[^\x20-\x7e\n]/g, "?");
}

export function textWidth(value: string, size: number): number {
  let total = 0;
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    total +=
      code >= 32 && code <= 126
        ? HELVETICA_WIDTHS[code - 32]
        : FALLBACK_WIDTH;
  }
  return (total * size) / 1000;
}

// Potong teks per kata agar muat di lebar tertentu. Kata yang lebih panjang dari lebar dipotong paksa.
export function wrapText(value: string, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of toPdfText(value).split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      let piece = word;
      while (textWidth(piece, size) > maxWidth && piece.length > 1) {
        let cut = piece.length - 1;
        while (cut > 1 && textWidth(piece.slice(0, cut), size) > maxWidth) cut--;
        lines.push(piece.slice(0, cut));
        piece = piece.slice(cut);
      }
      line = piece;
    }
    lines.push(line);
  }
  return lines;
}

type TextOptions = {
  size?: number;
  bold?: boolean;
  align?: "left" | "right";
  gray?: number; // 0 = hitam, 1 = putih
};

export class PdfDocument {
  private pages: string[][] = [];

  constructor() {
    this.addPage();
  }

  get pageCount(): number {
    return this.pages.length;
  }

  addPage(): void {
    this.pages.push([]);
  }

  private get current(): string[] {
    return this.pages[this.pages.length - 1];
  }

  text(x: number, y: number, value: string, options: TextOptions = {}): void {
    const { size = 10, bold = false, align = "left", gray = 0 } = options;
    const clean = toPdfText(value).replace(/\n/g, " ");
    const startX = align === "right" ? x - textWidth(clean, size) : x;
    const escaped = clean.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    this.current.push(
      `${gray} g`,
      "BT",
      `/${bold ? "F2" : "F1"} ${size} Tf`,
      `1 0 0 1 ${startX.toFixed(2)} ${this.pdfY(y).toFixed(2)} Tm`,
      `(${escaped}) Tj`,
      "ET",
    );
  }

  line(x1: number, y1: number, x2: number, y2: number, { width = 0.5, gray = 0.8 } = {}): void {
    this.current.push(
      `${width} w`,
      `${gray} G`,
      `${x1.toFixed(2)} ${this.pdfY(y1).toFixed(2)} m`,
      `${x2.toFixed(2)} ${this.pdfY(y2).toFixed(2)} l`,
      "S",
    );
  }

  rect(x: number, y: number, w: number, h: number, gray = 0.95): void {
    this.current.push(
      `${gray} g`,
      `${x.toFixed(2)} ${(this.pdfY(y) - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`,
      "f",
    );
  }

  private pdfY(y: number): number {
    return PAGE.height - y;
  }

  toBytes(): Uint8Array<ArrayBuffer> {
    const pageCount = this.pages.length;
    // Urutan objek: 1 katalog, 2 daftar halaman, 3 Helvetica, 4 Helvetica-Bold,
    // lalu untuk tiap halaman: objek halaman (5 + 2i) dan isinya (6 + 2i).
    const objects: string[] = [];
    const kids = this.pages.map((_, i) => `${5 + 2 * i} 0 R`).join(" ");
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;
    objects[3] =
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objects[4] =
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    this.pages.forEach((ops, i) => {
      const stream = ops.join("\n");
      objects[5 + 2 * i] =
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + 2 * i} 0 R >>`;
      objects[6 + 2 * i] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });

    // Semua karakter berada di rentang 0–255, sehingga panjang string sama dengan jumlah byte.
    let out = "%PDF-1.4\n%âãÏÓ\n";
    const offsets: number[] = [];
    for (let i = 1; i < objects.length; i++) {
      offsets[i] = out.length;
      out += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefOffset = out.length;
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++) {
      out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Uint8Array.from(out, (ch) => ch.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
  }
}
