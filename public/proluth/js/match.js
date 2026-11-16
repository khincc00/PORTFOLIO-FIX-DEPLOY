/* ProLuth — cocokkan warna & tonal gambar ke foto referensi.
   Hasilnya berupa parameter biasa (kurva master, kurva R/G/B, saturasi) sehingga tetap bisa diedit. */
(function (root) {
  'use strict';

  const E = root.ProLuth;
  const SAMPLE_MAX = 256;   // sisi terpanjang sampel analisis
  const FIT_LUT = 33;
  const TONE_Q = [0.02, 0.12, 0.3, 0.5, 0.7, 0.88, 0.98];
  const BINS = 256, HIST_BLUR = 7; // histogram luma dihaluskan agar puncak konten tidak membuat kurva melonjak
  const NODES = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1]; // titik kurva warna per tingkat terang
  const SIGMA = 0.09;       // lebar kernel luma untuk membaca cast per zona
  const NEUTRAL = 0.1;      // piksel berkroma rendah paling dipercaya untuk membaca cast
  const MAX_CAST = 0.15;    // batas lembut besarnya cast — selisih lebih besar biasanya beda konten, bukan grade
  const MIN_SLOPE = 0.3, MAX_SLOPE = 2.5;
  const MAX_SAT = 1.5;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const round4 = (v) => Math.round(v * 1e4) / 1e4;

  // Piksel RGBA 8-bit dari gambar/canvas, diperkecil; piksel transparan dibuang
  function samplePixels(src, w, h) {
    const s = Math.min(1, SAMPLE_MAX / Math.max(w, h));
    const sw = Math.max(1, Math.round(w * s)), sh = Math.max(1, Math.round(h * s));
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, sw, sh);
    const d = x.getImageData(0, 0, sw, sh).data;
    const out = new Uint8ClampedArray(d.length);
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      out[n++] = d[i]; out[n++] = d[i + 1]; out[n++] = d[i + 2]; out[n++] = 255;
    }
    return out.slice(0, n);
  }

  function castAt(cast, y, out) {
    let k = 0;
    while (k < NODES.length - 2 && y > NODES[k + 1]) k++;
    const t = clamp((y - NODES[k]) / (NODES[k + 1] - NODES[k]), 0, 1);
    for (let c = 0; c < 3; c++) out[c] = cast[k][c] + (cast[k + 1][c] - cast[k][c]) * t;
    return out;
  }

  // Ringkasan statistik: distribusi luma, cast rata-rata per tingkat terang, dan sebaran kroma
  function analyze(px) {
    const n = px.length >> 2, K = NODES.length;
    const Y = new Float32Array(n), C = new Float32Array(n * 3);
    const sum = new Float64Array(K * 3), wsum = new Float64Array(K), dens = new Float64Array(K);
    const inv2s2 = 1 / (2 * SIGMA * SIGMA);
    for (let i = 0; i < n; i++) {
      const r = px[i * 4] / 255, g = px[i * 4 + 1] / 255, b = px[i * 4 + 2] / 255;
      const y = luma(r, g, b), cr = r - y, cg = g - y, cb = b - y;
      Y[i] = y;
      C[i * 3] = cr; C[i * 3 + 1] = cg; C[i * 3 + 2] = cb;
      const w = 1 / (1 + (cr * cr + cg * cg + cb * cb) / (NEUTRAL * NEUTRAL));
      for (let k = 0; k < K; k++) {
        const d = y - NODES[k];
        const kw = Math.exp(-d * d * inv2s2);
        if (kw < 1e-4) continue;
        dens[k] += kw;
        const ww = kw * w;
        wsum[k] += ww;
        sum[k * 3] += ww * cr; sum[k * 3 + 1] += ww * cg; sum[k * 3 + 2] += ww * cb;
      }
    }
    const cast = [], density = [];
    for (let k = 0; k < K; k++) {
      const s = wsum[k] > 0 ? 1 / wsum[k] : 0;
      cast.push([sum[k * 3] * s, sum[k * 3 + 1] * s, sum[k * 3 + 2] * s]);
      density.push(n ? dens[k] / n : 0);
    }
    let spread = 0, cnt = 0;
    const c = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      if (Y[i] < 0.03 || Y[i] > 0.97) continue;
      castAt(cast, Y[i], c);
      spread += Math.hypot(C[i * 3] - c[0], C[i * 3 + 1] - c[1], C[i * 3 + 2] - c[2]);
      cnt++;
    }
    return { cdf: lumaCdf(Y), cast, density, spread: cnt ? spread / cnt : 0 };
  }

  function lumaCdf(Y) {
    const h = new Float64Array(BINS);
    for (let i = 0; i < Y.length; i++) h[Math.min(BINS - 1, (Y[i] * BINS) | 0)]++;
    const R = HIST_BLUR * 3, k = [];
    for (let d = -R; d <= R; d++) k.push(Math.exp((-d * d) / (2 * HIST_BLUR * HIST_BLUR)));
    const cdf = new Float64Array(BINS);
    let acc = 0;
    for (let i = 0; i < BINS; i++) {
      let v = 0;
      for (let d = -R; d <= R; d++) {
        let j = i + d;
        if (j < 0) j = -j - 1; else if (j >= BINS) j = 2 * BINS - j - 1; // pantulkan di tepi
        v += h[j] * k[d + R];
      }
      cdf[i] = acc += v;
    }
    for (let i = 0; i < BINS; i++) cdf[i] /= acc || 1;
    return cdf;
  }

  function quantile(cdf, p) {
    let i = 0;
    while (i < BINS - 1 && cdf[i] < p) i++;
    const lo = i > 0 ? cdf[i - 1] : 0;
    const t = cdf[i] > lo ? (p - lo) / (cdf[i] - lo) : 0.5;
    return (i + clamp(t, 0, 1)) / BINS;
  }

  // Batasi panjang vektor cast secara halus; arah (rona) tetap
  function softLimit(v) {
    const m = Math.hypot(v[0], v[1], v[2]);
    if (m < 1e-6) return v;
    const s = (MAX_CAST * Math.tanh(m / MAX_CAST)) / m;
    return [v[0] * s, v[1] * s, v[2] * s];
  }

  // Kurva master dari pencocokan histogram luma, dengan batas kemiringan agar tidak terjadi banding
  function toneCurve(src, ref) {
    const pts = [];
    let mid = 0;
    for (const p of TONE_Q) {
      const x = quantile(src, p);
      if (x < 0.02 || x > 0.98) continue;
      if (pts.length && x - pts[pts.length - 1][0] < 0.03) continue;
      if (p <= 0.5) mid = pts.length;
      pts.push([x, quantile(ref, p)]);
    }
    if (pts.length < 2) return [[0, 0], [1, 1]];

    for (let i = mid + 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0];
      pts[i][1] = pts[i - 1][1] + clamp((pts[i][1] - pts[i - 1][1]) / dx, MIN_SLOPE, MAX_SLOPE) * dx;
    }
    for (let i = mid - 1; i >= 0; i--) {
      const dx = pts[i + 1][0] - pts[i][0];
      pts[i][1] = pts[i + 1][1] - clamp((pts[i + 1][1] - pts[i][1]) / dx, MIN_SLOPE, MAX_SLOPE) * dx;
    }

    // Ujung kurva meneruskan kemiringan segmen terluar (hitam bisa terangkat seperti film)
    const a = pts[0], a2 = pts[1], z = pts[pts.length - 1], z2 = pts[pts.length - 2];
    const y0 = clamp(a[1] - ((a2[1] - a[1]) / (a2[0] - a[0])) * a[0], 0, Math.max(0, a[1]));
    const y1 = clamp(z[1] + ((z[1] - z2[1]) / (z[0] - z2[0])) * (1 - z[0]), Math.min(1, z[1]), 1);
    return [[0, round4(y0)], ...pts.map(([x, y]) => [round4(x), round4(clamp(y, 0, 1))]), [1, round4(y1)]];
  }

  // Kurva R/G/B yang menggeser tiap kanal sebesar cast pada tingkat terang tersebut
  function castCurves(cast, k) {
    const out = {};
    ['r', 'g', 'b'].forEach((ch, c) => {
      let prev = 0;
      out[ch] = NODES.map((x, j) => {
        let y = clamp(x + cast[j][c] * k, 0, 1);
        if (j > 0) {
          const dx = x - NODES[j - 1];
          y = Math.min(1, clamp(y, prev + 0.5 * dx, prev + 1.8 * dx));
        }
        prev = y;
        return [x, round4(y)];
      });
    });
    return out;
  }

  // srcPx/refPx: RGBA 8-bit. base: LUT dasar yang sedang aktif (boleh null). soft: mode gambar normal.
  function fit(srcPx, refPx, base, soft) {
    const ref = analyze(refPx);
    const out = new Uint8ClampedArray(srcPx.length);
    const run = (p) => analyze(E.applyToPixels(E.buildLUT(p, FIT_LUT, base, soft), srcPx, out));
    const p = E.defaultParams();

    // 1. Tonal: samakan distribusi kecerahan
    p.curves.rgb = toneCurve(run(p).cdf, ref.cdf);

    // 2. Saturasi: samakan sebaran kroma di sekitar cast
    let sat = 1;
    for (let it = 0; it < 3; it++) {
      const s = run(p).spread;
      if (s < 1e-4) break;
      sat = clamp((sat * ref.spread) / s, 0, MAX_SAT);
      p.saturation = (sat - 1) * 100;
    }

    // 3. Warna per tingkat terang: cast bayangan, midtone, dan highlight
    const cast = NODES.map(() => [0, 0, 0]);
    for (let it = 0; it < 2; it++) {
      Object.assign(p.curves, castCurves(cast, 1));
      const s = run(p);
      for (let k = 0; k < NODES.length; k++) {
        const d = Math.min(ref.density[k], s.density[k]);
        const trust = d / (d + 0.01); // zona yang hampir kosong tidak diberi cast
        cast[k] = softLimit(cast[k].map((v, c) => v + (ref.cast[k][c] - s.cast[k][c]) * trust));
      }
    }

    return { tone: p.curves.rgb, sat, cast };
  }

  // tone, color: kekuatan 0–1
  function toParams(result, tone, color) {
    const rgb = result.tone.map(([x, y]) => [x, round4(x + (y - x) * tone)]);
    return {
      saturation: Math.round((result.sat - 1) * 100 * color),
      curves: Object.assign({ rgb }, castCurves(result.cast, color)),
    };
  }

  const api = { samplePixels, analyze, fit, toParams };
  root.ProLuthMatch = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
