/* ProLuth — editor kurva interaktif (RGB master + per kanal) */
(function (root) {
  'use strict';

  const COLORS = { rgb: '#e8e8e8', r: '#ff6464', g: '#52d681', b: '#5c9dff' };
  const HIT = 11;
  const MAX_POINTS = 14;
  const PAD = 10;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function CurveEditor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.curves = null;
    this.channel = 'rgb';
    this.hist = null;
    this.onChange = opts.onChange || function () {};
    this.onCommit = opts.onCommit || function () {};
    this.drag = -1;
    this.hover = -1;
    this.w = 0;
    this.h = 0;

    canvas.addEventListener('pointerdown', (e) => this._down(e));
    canvas.addEventListener('pointermove', (e) => this._move(e));
    canvas.addEventListener('pointerup', (e) => this._up(e));
    canvas.addEventListener('pointercancel', (e) => this._up(e));
    canvas.addEventListener('pointerleave', () => { if (this.drag < 0) { this.hover = -1; this.draw(); } });
    canvas.addEventListener('dblclick', (e) => this._remove(e));
    canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this._remove(e); });

    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  const P = CurveEditor.prototype;

  P.setCurves = function (curves) { this.curves = curves; this.draw(); };
  P.setChannel = function (ch) { this.channel = ch; this.hover = -1; this.draw(); };
  P.setHistogram = function (hist) { this.hist = hist; this.draw(); };
  P.points = function () { return this.curves[this.channel]; };

  P.resize = function () {
    const dpr = window.devicePixelRatio || 1;
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.dpr = dpr;
    this.draw();
  };

  P.toPx = function (x, y) {
    return [PAD + x * (this.w - 2 * PAD), PAD + (1 - y) * (this.h - 2 * PAD)];
  };

  P.fromEvent = function (e) {
    const r = this.canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    return {
      px, py,
      x: clamp((px - PAD) / (this.w - 2 * PAD), 0, 1),
      y: clamp(1 - (py - PAD) / (this.h - 2 * PAD), 0, 1),
    };
  };

  P.hitTest = function (px, py) {
    const pts = this.points();
    let best = -1, bestD = HIT;
    for (let i = 0; i < pts.length; i++) {
      const q = this.toPx(pts[i][0], pts[i][1]);
      const d = Math.hypot(q[0] - px, q[1] - py);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  };

  P._down = function (e) {
    if (!this.curves || e.button === 2) return;
    const m = this.fromEvent(e);
    let idx = this.hitTest(m.px, m.py);
    if (idx < 0) {
      const pts = this.points();
      if (pts.length >= MAX_POINTS) return;
      if (pts.some((p) => Math.abs(p[0] - m.x) < 0.02)) return;
      pts.push([m.x, m.y]);
      pts.sort((a, b) => a[0] - b[0]);
      idx = pts.findIndex((p) => p[0] === m.x);
      this.onChange();
    }
    this.drag = idx;
    this.canvas.setPointerCapture(e.pointerId);
    this.draw();
  };

  P._move = function (e) {
    if (!this.curves) return;
    const m = this.fromEvent(e);
    if (this.drag < 0) {
      const h = this.hitTest(m.px, m.py);
      if (h !== this.hover) { this.hover = h; this.draw(); }
      this.canvas.style.cursor = h >= 0 ? 'grab' : 'crosshair';
      return;
    }
    const pts = this.points();
    const i = this.drag;
    const lo = i > 0 ? pts[i - 1][0] + 0.01 : 0;
    const hi = i < pts.length - 1 ? pts[i + 1][0] - 0.01 : 1;
    pts[i] = [clamp(m.x, lo, hi), m.y];
    this.canvas.style.cursor = 'grabbing';
    this.onChange();
    this.draw();
  };

  P._up = function () {
    if (this.drag < 0) return;
    this.drag = -1;
    this.onCommit();
    this.draw();
  };

  P._remove = function (e) {
    if (!this.curves) return;
    const m = this.fromEvent(e);
    const idx = this.hitTest(m.px, m.py);
    const pts = this.points();
    if (idx > 0 && idx < pts.length - 1) {
      pts.splice(idx, 1);
      this.hover = -1;
      this.onChange();
      this.onCommit();
      this.draw();
    }
  };

  P._plot = function (pts, color, width) {
    const ctx = this.ctx;
    const n = Math.max(64, Math.round(this.w));
    const table = root.ProLuth.buildCurveTable(pts, n);
    ctx.beginPath();
    for (let j = 0; j < n; j++) {
      const q = this.toPx(j / (n - 1), table[j]);
      if (j === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  P.draw = function () {
    if (!this.w || !this.curves) return;
    const ctx = this.ctx, w = this.w, h = this.h;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);

    const iw = w - 2 * PAD, ih = h - 2 * PAD;

    // Histogram hasil
    if (this.hist) {
      const bins = this.hist[this.channel === 'rgb' ? 'l' : this.channel];
      let max = 1;
      for (let i = 2; i < 254; i++) if (bins[i] > max) max = bins[i];
      ctx.beginPath();
      ctx.moveTo(PAD, PAD + ih);
      for (let i = 0; i < 256; i++) {
        const v = Math.min(1, bins[i] / max);
        ctx.lineTo(PAD + (i / 255) * iw, PAD + ih - v * ih * 0.92);
      }
      ctx.lineTo(PAD + iw, PAD + ih);
      ctx.closePath();
      ctx.fillStyle = this.channel === 'rgb' ? 'rgba(255,255,255,0.08)' : hexA(COLORS[this.channel], 0.14);
      ctx.fill();
    }

    // Grid
    ctx.strokeStyle = '#262626';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      const gx = Math.round(PAD + (iw * i) / 4) + 0.5, gy = Math.round(PAD + (ih * i) / 4) + 0.5;
      ctx.moveTo(gx, PAD); ctx.lineTo(gx, PAD + ih);
      ctx.moveTo(PAD, gy); ctx.lineTo(PAD + iw, gy);
    }
    ctx.stroke();
    ctx.strokeStyle = '#333';
    ctx.strokeRect(PAD + 0.5, PAD + 0.5, iw - 1, ih - 1);

    // Diagonal acuan
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.moveTo(PAD, PAD + ih);
    ctx.lineTo(PAD + iw, PAD);
    ctx.stroke();
    ctx.setLineDash([]);

    // Kanal lain (samar)
    for (const ch of ['rgb', 'r', 'g', 'b']) {
      if (ch === this.channel || root.ProLuth.isIdentityCurve(this.curves[ch])) continue;
      this._plot(this.curves[ch], hexA(COLORS[ch], 0.3), 1);
    }

    // Kanal aktif
    const pts = this.points();
    const color = COLORS[this.channel];
    this._plot(pts, color, 1.75);

    for (let i = 0; i < pts.length; i++) {
      const q = this.toPx(pts[i][0], pts[i][1]);
      const active = i === this.drag || i === this.hover;
      ctx.beginPath();
      ctx.arc(q[0], q[1], active ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fillStyle = active ? color : '#111';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  };

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  root.CurveEditor = CurveEditor;
})(window);
