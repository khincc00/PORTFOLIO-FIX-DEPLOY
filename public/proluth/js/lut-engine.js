/* ProLuth — mesin warna, pembangun LUT 3D, serta baca/tulis format .cube */
(function (root) {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smoothstep = (a, b, x) => {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Mode "normal": nilai di atas KNEE dimampatkan perlahan ke 1 (bukan dipotong keras),
  // sehingga dorongan highlight tidak menghanguskan detail. Turunan tetap 1 di KNEE.
  const KNEE = 0.9;
  const softClip = (v) => (v <= KNEE ? (v < 0 ? 0 : v) : KNEE + (1 - KNEE) * Math.tanh((v - KNEE) / (1 - KNEE)));

  function toLinear(v) {
    const a = Math.abs(v);
    const l = a <= 0.04045 ? a / 12.92 : Math.pow((a + 0.055) / 1.055, 2.4);
    return v < 0 ? -l : l;
  }

  function toSrgb(v) {
    const a = Math.abs(v);
    const s = a <= 0.0031308 ? a * 12.92 : 1.055 * Math.pow(a, 1 / 2.4) - 0.055;
    return v < 0 ? -s : s;
  }

  // hsl(h, 100%, 50%) -> [r, g, b]
  function hueToRgb(h) {
    const k = (n) => (n + h / 30) % 12;
    const f = (n) => 0.5 - 0.5 * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0), f(8), f(4)];
  }

  const CHANNELS = ['rgb', 'r', 'g', 'b'];

  function defaultParams() {
    return {
      exposure: 0,
      contrast: 0,
      highlights: 0,
      shadows: 0,
      fade: 0,
      temperature: 0,
      tint: 0,
      vibrance: 0,
      saturation: 0,
      hue: 0,
      shadowHue: 200,
      shadowAmt: 0,
      midHue: 30,
      midAmt: 0,
      highHue: 40,
      highAmt: 0,
      curves: { rgb: [[0, 0], [1, 1]], r: [[0, 0], [1, 1]], g: [[0, 0], [1, 1]], b: [[0, 0], [1, 1]] },
      intensity: 100,
    };
  }

  function mergeParams(partial) {
    const p = defaultParams();
    if (!partial) return p;
    for (const k of Object.keys(partial)) {
      if (k === 'curves') {
        for (const c of CHANNELS) {
          const pts = partial.curves && partial.curves[c];
          if (Array.isArray(pts) && pts.length >= 2) p.curves[c] = pts.map((pt) => [+pt[0], +pt[1]]);
        }
      } else if (k in p && typeof partial[k] === 'number' && isFinite(partial[k])) {
        p[k] = partial[k];
      }
    }
    return p;
  }

  /* ---------- Kurva (spline kubik monoton, Fritsch–Carlson) ---------- */

  function isIdentityCurve(pts) {
    return pts.every((pt) => Math.abs(pt[0] - pt[1]) < 1e-6);
  }

  function buildCurveTable(points, n) {
    n = n || 1024;
    const table = new Float32Array(n);
    const pts = points.slice().sort((a, b) => a[0] - b[0]);
    const m = pts.length;
    if (m < 2) {
      for (let j = 0; j < n; j++) table[j] = j / (n - 1);
      return table;
    }
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const dx = [], slope = [];
    for (let i = 0; i < m - 1; i++) {
      dx[i] = xs[i + 1] - xs[i];
      slope[i] = dx[i] > 0 ? (ys[i + 1] - ys[i]) / dx[i] : 0;
    }
    const t = new Array(m);
    t[0] = slope[0];
    t[m - 1] = slope[m - 2];
    for (let i = 1; i < m - 1; i++) {
      t[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
    }
    for (let i = 0; i < m - 1; i++) {
      if (slope[i] === 0) {
        t[i] = 0;
        t[i + 1] = 0;
      } else {
        const a = t[i] / slope[i], b = t[i + 1] / slope[i];
        const s = a * a + b * b;
        if (s > 9) {
          const tau = 3 / Math.sqrt(s);
          t[i] = tau * a * slope[i];
          t[i + 1] = tau * b * slope[i];
        }
      }
    }
    let seg = 0;
    for (let j = 0; j < n; j++) {
      const x = j / (n - 1);
      let y;
      if (x <= xs[0]) y = ys[0];
      else if (x >= xs[m - 1]) y = ys[m - 1];
      else {
        while (seg < m - 2 && x > xs[seg + 1]) seg++;
        const h = dx[seg];
        const u = (x - xs[seg]) / h;
        const u2 = u * u, u3 = u2 * u;
        y = (2 * u3 - 3 * u2 + 1) * ys[seg] + (u3 - 2 * u2 + u) * h * t[seg] +
            (-2 * u3 + 3 * u2) * ys[seg + 1] + (u3 - u2) * h * t[seg + 1];
      }
      table[j] = clamp01(y);
    }
    return table;
  }

  function curveAt(table, v) {
    const n = table.length - 1;
    const x = clamp01(v) * n;
    const i = x | 0;
    if (i >= n) return table[n];
    return table[i] + (table[i + 1] - table[i]) * (x - i);
  }

  /* ---------- Transformasi warna ---------- */

  function prepare(p, base, soft) {
    const ev = Math.pow(2, p.exposure);
    const t = p.temperature / 100, ti = p.tint / 100;
    let wb = [1 + 0.22 * t, 1 - 0.18 * ti, 1 - 0.22 * t];
    const norm = 1 / luma(wb[0], wb[1], wb[2]); // jaga kecerahan tetap saat white balance digeser
    wb = wb.map((v) => v * norm * ev);

    const tone = (hue, amt) => {
      if (!amt) return null;
      const c = hueToRgb(hue);
      const l = luma(c[0], c[1], c[2]);
      const s = (amt / 100) * 0.3;
      return [(c[0] - l) * s, (c[1] - l) * s, (c[2] - l) * s];
    };
    const tones = [tone(p.shadowHue, p.shadowAmt), tone(p.midHue, p.midAmt), tone(p.highHue, p.highAmt)];

    let hueM = null;
    if (p.hue) {
      const a = (p.hue * Math.PI) / 180, cs = Math.cos(a), sn = Math.sin(a);
      hueM = [
        0.213 + cs * 0.787 - sn * 0.213, 0.715 - cs * 0.715 - sn * 0.715, 0.072 - cs * 0.072 + sn * 0.928,
        0.213 - cs * 0.213 + sn * 0.143, 0.715 + cs * 0.285 + sn * 0.140, 0.072 - cs * 0.072 - sn * 0.283,
        0.213 - cs * 0.213 - sn * 0.787, 0.715 - cs * 0.715 + sn * 0.715, 0.072 + cs * 0.928 + sn * 0.072,
      ];
    }

    const curve = (c) => (isIdentityCurve(p.curves[c]) ? null : buildCurveTable(p.curves[c], 1024));

    return {
      base: base || null,
      lim: soft ? softClip : clamp01,
      linear: p.exposure !== 0 || t !== 0 || ti !== 0,
      wb,
      contrast: p.contrast / 100,
      contrastK: 1 + Math.max(0, p.contrast / 100) * 1.6,
      sh: p.shadows / 100,
      hl: p.highlights / 100,
      tones: tones.some(Boolean) ? tones : null,
      hueM,
      sat: 1 + p.saturation / 100,
      vib: (p.vibrance / 100) * 0.8,
      fade: (p.fade / 100) * 0.2,
      cRGB: curve('rgb'), cR: curve('r'), cG: curve('g'), cB: curve('b'),
      mix: clamp01(p.intensity / 100),
      tmp: [0, 0, 0],
    };
  }

  function sCurve(v, k) {
    return v < 0.5 ? 0.5 * Math.pow(2 * v, k) : 1 - 0.5 * Math.pow(2 * (1 - v), k);
  }

  function transform(ctx, r, g, b, out) {
    const r0 = r, g0 = g, b0 = b;

    if (ctx.base) {
      sampleLUT(ctx.base, r, g, b, ctx.tmp);
      r = ctx.tmp[0]; g = ctx.tmp[1]; b = ctx.tmp[2];
    }

    // Eksposur + white balance di ruang linear
    if (ctx.linear) {
      r = toSrgb(toLinear(r) * ctx.wb[0]);
      g = toSrgb(toLinear(g) * ctx.wb[1]);
      b = toSrgb(toLinear(b) * ctx.wb[2]);
    }
    r = ctx.lim(r); g = ctx.lim(g); b = ctx.lim(b);

    if (ctx.contrast > 0) {
      const k = ctx.contrastK;
      r = sCurve(r, k); g = sCurve(g, k); b = sCurve(b, k);
    } else if (ctx.contrast < 0) {
      const k = 1 + ctx.contrast * 0.6;
      r = 0.5 + (r - 0.5) * k; g = 0.5 + (g - 0.5) * k; b = 0.5 + (b - 0.5) * k;
    }

    if (ctx.sh || ctx.hl) {
      const L = clamp01(luma(r, g, b));
      const d = ctx.sh * 1.2 * L * (1 - L) * (1 - L) + ctx.hl * 1.2 * L * L * (1 - L);
      r += d; g += d; b += d;
    }

    // Color grading 3 zona (bayangan / midtone / highlight)
    if (ctx.tones) {
      const L = clamp01(luma(r, g, b));
      const ms = 1 - smoothstep(0, 0.65, L);
      const mh = smoothstep(0.35, 1, L);
      // Tint bayangan memudar mendekati hitam murni agar titik hitam tetap netral
      const masks = [ms * smoothstep(0, 0.3, L), Math.max(0, 1 - ms - mh), mh];
      for (let z = 0; z < 3; z++) {
        const v = ctx.tones[z];
        if (!v) continue;
        const m = masks[z];
        r += v[0] * m; g += v[1] * m; b += v[2] * m;
      }
    }

    if (ctx.hueM) {
      const M = ctx.hueM;
      const nr = M[0] * r + M[1] * g + M[2] * b;
      const ng = M[3] * r + M[4] * g + M[5] * b;
      const nb = M[6] * r + M[7] * g + M[8] * b;
      r = nr; g = ng; b = nb;
    }

    if (ctx.sat !== 1 || ctx.vib !== 0) {
      const L = luma(r, g, b);
      let s = ctx.sat;
      if (ctx.vib) {
        const chroma = clamp01(Math.max(r, g, b) - Math.min(r, g, b));
        s *= 1 + ctx.vib * (1 - chroma);
      }
      r = L + (r - L) * s; g = L + (g - L) * s; b = L + (b - L) * s;
    }

    if (ctx.fade) {
      const f = ctx.fade;
      r = f + r * (1 - f); g = f + g * (1 - f); b = f + b * (1 - f);
    }

    r = ctx.lim(r); g = ctx.lim(g); b = ctx.lim(b);

    if (ctx.cRGB) { r = curveAt(ctx.cRGB, r); g = curveAt(ctx.cRGB, g); b = curveAt(ctx.cRGB, b); }
    if (ctx.cR) r = curveAt(ctx.cR, r);
    if (ctx.cG) g = curveAt(ctx.cG, g);
    if (ctx.cB) b = curveAt(ctx.cB, b);

    if (ctx.mix < 1) {
      const m = ctx.mix;
      r = r0 + (r - r0) * m; g = g0 + (g - g0) * m; b = b0 + (b - b0) * m;
    }

    out[0] = clamp01(r); out[1] = clamp01(g); out[2] = clamp01(b);
    return out;
  }

  /* ---------- LUT 3D ---------- */

  function buildLUT(params, size, base, soft) {
    const ctx = prepare(mergeParams(params), base, soft);
    const data = new Float32Array(size * size * size * 3);
    const out = [0, 0, 0];
    const s = size - 1;
    let i = 0;
    // Urutan .cube: merah berubah paling cepat, lalu hijau, lalu biru
    for (let bi = 0; bi < size; bi++) {
      for (let gi = 0; gi < size; gi++) {
        for (let ri = 0; ri < size; ri++) {
          transform(ctx, ri / s, gi / s, bi / s, out);
          data[i++] = out[0]; data[i++] = out[1]; data[i++] = out[2];
        }
      }
    }
    return { size, data, domainMin: [0, 0, 0], domainMax: [1, 1, 1] };
  }

  function sampleLUT(lut, r, g, b, out) {
    const N = lut.size, d = lut.data, s = N - 1;
    const mn = lut.domainMin, mx = lut.domainMax;
    const x = clamp01((r - mn[0]) / (mx[0] - mn[0])) * s;
    const y = clamp01((g - mn[1]) / (mx[1] - mn[1])) * s;
    const z = clamp01((b - mn[2]) / (mx[2] - mn[2])) * s;
    let xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    if (xi >= s) xi = s - 1;
    if (yi >= s) yi = s - 1;
    if (zi >= s) zi = s - 1;
    const fx = x - xi, fy = y - yi, fz = z - zi;
    const sg = N * 3, sb = N * N * 3;
    const o = zi * sb + yi * sg + xi * 3;
    for (let c = 0; c < 3; c++) {
      const p = o + c;
      const c00 = d[p] + (d[p + 3] - d[p]) * fx;
      const c10 = d[p + sg] + (d[p + sg + 3] - d[p + sg]) * fx;
      const c01 = d[p + sb] + (d[p + sb + 3] - d[p + sb]) * fx;
      const c11 = d[p + sb + sg] + (d[p + sb + sg + 3] - d[p + sb + sg]) * fx;
      const c0 = c00 + (c10 - c00) * fy;
      const c1 = c01 + (c11 - c01) * fy;
      out[c] = c0 + (c1 - c0) * fz;
    }
    return out;
  }

  // Terapkan LUT (domain 0–1) ke piksel RGBA 8-bit. src dan dst boleh array yang sama.
  function applyToPixels(lut, src, dst) {
    const N = lut.size, d = lut.data, s = N - 1;
    const idx = new Int32Array(256), frac = new Float32Array(256);
    for (let v = 0; v < 256; v++) {
      const x = (v / 255) * s;
      let k = Math.floor(x);
      if (k >= s) k = s - 1;
      idx[v] = k;
      frac[v] = x - k;
    }
    const sg = N * 3, sb = N * N * 3;
    for (let p = 0, len = src.length; p < len; p += 4) {
      const R = src[p], G = src[p + 1], B = src[p + 2];
      const fx = frac[R], fy = frac[G], fz = frac[B];
      const o = idx[B] * sb + idx[G] * sg + idx[R] * 3;
      for (let c = 0; c < 3; c++) {
        const q = o + c;
        const c00 = d[q] + (d[q + 3] - d[q]) * fx;
        const c10 = d[q + sg] + (d[q + sg + 3] - d[q + sg]) * fx;
        const c01 = d[q + sb] + (d[q + sb + 3] - d[q + sb]) * fx;
        const c11 = d[q + sb + sg] + (d[q + sb + sg + 3] - d[q + sb + sg]) * fx;
        const c0 = c00 + (c10 - c00) * fy;
        const c1 = c01 + (c11 - c01) * fy;
        dst[p + c] = (c0 + (c1 - c0) * fz) * 255 + 0.5;
      }
      dst[p + 3] = src[p + 3];
    }
    return dst;
  }

  /* ---------- Format .cube ---------- */

  function toCube(lut, title) {
    const N = lut.size, d = lut.data;
    const safeTitle = String(title || 'ProLuth LUT').replace(/["\r\n]/g, '').trim() || 'ProLuth LUT';
    const head = [
      `TITLE "${safeTitle}"`,
      '# Dibuat dengan ProLuth',
      `LUT_3D_SIZE ${N}`,
      'DOMAIN_MIN 0.0 0.0 0.0',
      'DOMAIN_MAX 1.0 1.0 1.0',
      '',
    ];
    const count = N * N * N;
    const rows = new Array(count);
    for (let i = 0; i < count; i++) {
      const j = i * 3;
      rows[i] = d[j].toFixed(6) + ' ' + d[j + 1].toFixed(6) + ' ' + d[j + 2].toFixed(6);
    }
    return head.join('\n') + rows.join('\n') + '\n';
  }

  function parseCube(text) {
    const lines = String(text).split(/\r\n|\n|\r/);
    let size3 = 0, size1 = 0, title = '';
    let dmin = [0, 0, 0], dmax = [1, 1, 1];
    const vals = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line[0] === '#') continue;
      const parts = line.split(/\s+/);
      const key = parts[0].toUpperCase();
      if (key === 'TITLE') {
        title = line.slice(5).trim().replace(/^"|"$/g, '');
      } else if (key === 'LUT_3D_SIZE') {
        size3 = parseInt(parts[1], 10);
      } else if (key === 'LUT_1D_SIZE') {
        size1 = parseInt(parts[1], 10);
      } else if (key === 'DOMAIN_MIN') {
        dmin = parts.slice(1, 4).map(Number);
      } else if (key === 'DOMAIN_MAX') {
        dmax = parts.slice(1, 4).map(Number);
      } else if (key === 'LUT_3D_INPUT_RANGE' || key === 'LUT_1D_INPUT_RANGE') {
        const a = Number(parts[1]), b = Number(parts[2]);
        dmin = [a, a, a];
        dmax = [b, b, b];
      } else if (/^[-+.\d]/.test(key)) {
        if (parts.length < 3) throw new Error('baris data tidak valid: "' + line + '"');
        vals.push(Number(parts[0]), Number(parts[1]), Number(parts[2]));
      }
      // kata kunci lain diabaikan
    }
    if (vals.some((v) => !isFinite(v))) throw new Error('berisi angka yang tidak valid');
    if (dmin.some((v) => !isFinite(v)) || dmax.some((v, i) => !isFinite(v) || v <= dmin[i])) {
      throw new Error('DOMAIN_MIN/DOMAIN_MAX tidak valid');
    }

    if (size3) {
      if (size3 < 2 || size3 > 256) throw new Error('LUT_3D_SIZE di luar jangkauan (2–256)');
      const need = size3 * size3 * size3 * 3;
      if (vals.length < need) throw new Error(`data kurang: butuh ${need / 3} baris, ada ${vals.length / 3}`);
      return { size: size3, data: new Float32Array(vals.slice(0, need)), domainMin: dmin, domainMax: dmax, title };
    }
    if (size1) {
      if (size1 < 2) throw new Error('LUT_1D_SIZE tidak valid');
      if (vals.length < size1 * 3) throw new Error('data LUT 1D kurang');
      return { ...from1D(vals, size1, dmin, dmax), title };
    }
    throw new Error('LUT_3D_SIZE tidak ditemukan');
  }

  // Ubah LUT 1D per-kanal menjadi LUT 3D 33³ agar bisa dipakai sebagai dasar
  function from1D(vals, n, dmin, dmax) {
    const size = 33, s = size - 1;
    const at = (c, v) => {
      const x = clamp01((v - dmin[c]) / (dmax[c] - dmin[c])) * (n - 1);
      let i = Math.floor(x);
      if (i >= n - 1) i = n - 2;
      const f = x - i;
      return vals[i * 3 + c] + (vals[(i + 1) * 3 + c] - vals[i * 3 + c]) * f;
    };
    const data = new Float32Array(size * size * size * 3);
    let k = 0;
    for (let b = 0; b < size; b++)
      for (let g = 0; g < size; g++)
        for (let r = 0; r < size; r++) {
          data[k++] = at(0, r / s);
          data[k++] = at(1, g / s);
          data[k++] = at(2, b / s);
        }
    return { size, data, domainMin: [0, 0, 0], domainMax: [1, 1, 1] };
  }

  const api = {
    defaultParams, mergeParams, buildCurveTable, isIdentityCurve, hueToRgb,
    buildLUT, sampleLUT, applyToPixels, toCube, parseCube,
  };
  root.ProLuth = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
