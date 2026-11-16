/* ProLuth — antarmuka aplikasi */
(function () {
  'use strict';

  const E = window.ProLuth;
  const PRESETS = window.PROLUTH_PRESETS;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  const PREVIEW_MAX = 1400;   // sisi terpanjang gambar pratinjau
  const PREVIEW_LUT = 33;     // ukuran LUT untuk pratinjau
  const THUMB_W = 240, THUMB_H = 160;
  const DEFAULTS = E.defaultParams();

  const state = {
    params: E.defaultParams(),
    base: null,
    baseName: '',
    compare: 'after',
    split: 0.5,
    peek: false,
    source: null,
    sourceW: 0,
    sourceH: 0,
    sourceName: '',
    sourceId: 0,
    ref: null,               // foto referensi + hasil pencocokan terakhir
    match: { tone: 100, color: 100 },
    srcType: 'normal',       // 'normal' = gambar sudah berwarna jadi; 'raw' = gambar datar (Log/Flat)
    orig: null,
    out: null,
    thumb: null,
    activePreset: 'netral',
  };

  /* ---------- Definisi kontrol ---------- */

  const signed = (d) => (v) => (v > 0 ? '+' : '') + v.toFixed(d);
  const deg = (v) => (v > 0 ? '+' : '') + Math.round(v) + '°';

  const GROUPS = {
    basic: [
      { key: 'exposure', label: 'Eksposur', min: -3, max: 3, step: 0.05, bipolar: true, fmt: (v) => signed(2)(v) + ' EV' },
      { key: 'contrast', label: 'Kontras', min: -100, max: 100, bipolar: true },
      { key: 'highlights', label: 'Highlight', min: -100, max: 100, bipolar: true },
      { key: 'shadows', label: 'Bayangan', min: -100, max: 100, bipolar: true },
      { key: 'fade', label: 'Fade (angkat hitam)', min: 0, max: 100 },
    ],
    color: [
      { key: 'temperature', label: 'Temperatur', min: -100, max: 100, track: 'linear-gradient(90deg,#3f7fe0,#8a8a8a 50%,#e2b03c)' },
      { key: 'tint', label: 'Tint', min: -100, max: 100, track: 'linear-gradient(90deg,#3fbf5a,#8a8a8a 50%,#d24fc4)' },
      { key: 'vibrance', label: 'Vibrance', min: -100, max: 100, bipolar: true },
      { key: 'saturation', label: 'Saturasi', min: -100, max: 100, bipolar: true },
      { key: 'hue', label: 'Geser rona', min: -180, max: 180, bipolar: true, fmt: deg },
    ],
    output: [
      { key: 'intensity', label: 'Intensitas LUT', min: 0, max: 100, fmt: (v) => Math.round(v) + '%' },
    ],
  };

  const RAINBOW = 'linear-gradient(90deg,' +
    Array.from({ length: 13 }, (_, i) => `hsl(${i * 30} 85% 55%)`).join(',') + ')';

  const ZONES = [
    { id: 'shadow', label: 'Bayangan' },
    { id: 'mid', label: 'Midtone' },
    { id: 'high', label: 'Highlight' },
  ];

  const controls = {}; // key -> { spec, input, output, el }

  const soft = () => state.srcType === 'normal';

  function fmtValue(spec, v) {
    if (spec.fmt) return spec.fmt(v);
    return spec.bipolar || spec.min < 0 ? signed(0)(v) : String(Math.round(v));
  }

  const ctlMarkup = (id, label, spec) =>
    `<div class="ctl-head"><label for="${id}">${label}</label><output for="${id}"></output></div>` +
    `<input type="range" id="${id}" min="${spec.min}" max="${spec.max}" step="${spec.step || 1}">`;

  function fillTrack(spec, v) {
    const pct = ((v - spec.min) / (spec.max - spec.min)) * 100;
    const zero = spec.bipolar ? ((0 - spec.min) / (spec.max - spec.min)) * 100 : 0;
    const a = Math.min(pct, zero), b = Math.max(pct, zero);
    return `linear-gradient(90deg,var(--track) ${a}%,var(--fill) ${a}%,var(--fill) ${b}%,var(--track) ${b}%)`;
  }

  function makeControl(spec) {
    const el = document.createElement('div');
    el.className = 'ctl';
    const id = 's-' + spec.key;
    el.innerHTML = ctlMarkup(id, spec.label, spec);
    const input = el.querySelector('input');
    const output = el.querySelector('output');
    controls[spec.key] = { spec, input, output, el };

    input.addEventListener('input', () => {
      state.params[spec.key] = parseFloat(input.value);
      onParamEdited(spec.key);
    });
    input.addEventListener('change', commit);
    const reset = () => {
      state.params[spec.key] = DEFAULTS[spec.key];
      onParamEdited(spec.key);
      commit();
    };
    input.addEventListener('dblclick', reset);
    el.querySelector('label').addEventListener('dblclick', reset);
    el.title = 'Klik dua kali untuk reset';
    return el;
  }

  function paintControl(key) {
    const c = controls[key];
    if (!c) return;
    const v = state.params[key];
    const { spec, input, output, el } = c;
    input.value = v;
    output.textContent = fmtValue(spec, v);
    el.classList.toggle('changed', v !== DEFAULTS[key]);

    let track = spec.track;
    if (spec.zone) {
      const h = state.params[spec.zone + 'Hue'];
      track = `linear-gradient(90deg,#555,hsl(${h} 90% 55%))`;
    }
    input.style.setProperty('--trk', track || fillTrack(spec, v));
  }

  function paintZone(zone) {
    const h = state.params[zone + 'Hue'], a = state.params[zone + 'Amt'];
    const sw = $('sw-' + zone);
    if (sw) sw.style.background = a > 0 ? `hsl(${h} ${30 + a * 0.6}% 52%)` : '#555';
    paintControl(zone + 'Amt');
  }

  function buildControls() {
    for (const group of Object.keys(GROUPS)) {
      const host = document.querySelector(`[data-group="${group}"]`);
      for (const spec of GROUPS[group]) host.appendChild(makeControl(spec));
    }

    const host = document.querySelector('[data-group="grading"]');
    for (const z of ZONES) {
      const box = document.createElement('div');
      box.className = 'zone';
      box.innerHTML =
        `<div class="zone-head"><span class="swatch" id="sw-${z.id}"></span>${z.label}` +
        `<button type="button" class="link" data-zone="${z.id}">Reset</button></div>`;
      box.appendChild(makeControl({ key: z.id + 'Hue', label: 'Rona', min: 0, max: 360, track: RAINBOW, fmt: (v) => Math.round(v) + '°' }));
      box.appendChild(makeControl({ key: z.id + 'Amt', label: 'Kekuatan', min: 0, max: 100, zone: z.id }));
      box.querySelector('[data-zone]').addEventListener('click', () => {
        state.params[z.id + 'Hue'] = DEFAULTS[z.id + 'Hue'];
        state.params[z.id + 'Amt'] = 0;
        onParamEdited(z.id + 'Hue');
        commit();
      });
      host.appendChild(box);
    }
  }

  function onParamEdited(key) {
    paintControl(key);
    const m = /^(shadow|mid|high)(Hue|Amt)$/.exec(key);
    if (m) { paintControl(m[1] + 'Hue'); paintZone(m[1]); }
    setActivePreset(null);
    scheduleRender();
  }

  function syncUI() {
    for (const key of Object.keys(controls)) paintControl(key);
    for (const z of ZONES) paintZone(z.id);
    curve.setCurves(state.params.curves);
  }

  /* ---------- Riwayat (undo/redo) ---------- */

  const history = { stack: [], index: -1 };

  function commit() {
    const snap = JSON.stringify(state.params);
    if (history.stack[history.index] === snap) return;
    history.stack = history.stack.slice(0, history.index + 1);
    history.stack.push(snap);
    if (history.stack.length > 150) history.stack.shift();
    history.index = history.stack.length - 1;
    updateHistoryButtons();
  }

  function stepHistory(dir) {
    const next = history.index + dir;
    if (next < 0 || next >= history.stack.length) return;
    history.index = next;
    state.params = JSON.parse(history.stack[next]);
    setActivePreset(null);
    syncUI();
    scheduleRender();
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    $('btnUndo').disabled = history.index <= 0;
    $('btnRedo').disabled = history.index >= history.stack.length - 1;
  }

  /* ---------- Pratinjau ---------- */

  const stage = $('stage');
  const wrap = $('canvasWrap');
  const canvas = $('preview');
  const pctx = canvas.getContext('2d');
  let rafId = 0;

  function scheduleRender() {
    if (!rafId) rafId = requestAnimationFrame(render);
  }

  function render() {
    rafId = 0;
    if (!state.orig) return;
    const lut = E.buildLUT(state.params, PREVIEW_LUT, state.base, soft());
    E.applyToPixels(lut, state.orig.data, state.out.data);
    draw();
    curve.setHistogram(histogram(state.out.data));
  }

  function draw() {
    if (!state.orig) return;
    const mode = state.peek ? 'before' : state.compare;
    if (mode === 'before') {
      pctx.putImageData(state.orig, 0, 0);
    } else {
      pctx.putImageData(state.out, 0, 0);
      if (mode === 'split') {
        const sx = Math.round(canvas.width * state.split);
        if (sx > 0) pctx.putImageData(state.orig, 0, 0, 0, 0, sx, canvas.height);
      }
    }
    const split = state.compare === 'split' && !state.peek;
    $('divider').hidden = !split;
    $('divider').style.left = state.split * 100 + '%';
    $('tagBefore').hidden = !(split || mode === 'before');
    $('tagAfter').hidden = !(split || mode === 'after');
    wrap.classList.toggle('split', state.compare === 'split');
    wrap.classList.toggle('peek', state.compare === 'after');
  }

  function histogram(px) {
    const r = new Uint32Array(256), g = new Uint32Array(256), b = new Uint32Array(256), l = new Uint32Array(256);
    for (let i = 0; i < px.length; i += 12) { // sampel tiap 3 piksel
      const R = px[i], G = px[i + 1], B = px[i + 2];
      r[R]++; g[G]++; b[B]++;
      l[(0.2126 * R + 0.7152 * G + 0.0722 * B + 0.5) | 0]++;
    }
    return { r, g, b, l };
  }

  function fitCanvas() {
    if (!state.orig) return;
    const rect = stage.getBoundingClientRect();
    const pad = rect.width < 600 ? 24 : 48;
    const aw = Math.max(40, rect.width - pad), ah = Math.max(40, rect.height - pad);
    const s = Math.min(aw / state.orig.width, ah / state.orig.height);
    wrap.style.width = Math.floor(state.orig.width * s) + 'px';
    wrap.style.height = Math.floor(state.orig.height * s) + 'px';
  }

  function setSource(src, w, h, name) {
    state.source = src;
    state.sourceW = w;
    state.sourceH = h;
    state.sourceName = name;
    state.sourceId++;

    const scale = Math.min(1, PREVIEW_MAX / Math.max(w, h));
    const pw = Math.max(1, Math.round(w * scale)), ph = Math.max(1, Math.round(h * scale));
    const off = document.createElement('canvas');
    off.width = pw;
    off.height = ph;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.imageSmoothingQuality = 'high';
    octx.drawImage(src, 0, 0, pw, ph);
    state.orig = octx.getImageData(0, 0, pw, ph);
    state.out = new ImageData(pw, ph);
    canvas.width = pw;
    canvas.height = ph;

    // Thumbnail untuk kartu preset (crop tengah 3:2)
    const t = document.createElement('canvas');
    t.width = THUMB_W;
    t.height = THUMB_H;
    const tctx = t.getContext('2d', { willReadFrequently: true });
    const ts = Math.max(THUMB_W / w, THUMB_H / h);
    tctx.imageSmoothingQuality = 'high';
    tctx.drawImage(src, (THUMB_W - w * ts) / 2, (THUMB_H - h * ts) / 2, w * ts, h * ts);
    state.thumb = tctx.getImageData(0, 0, THUMB_W, THUMB_H);

    $('imageInfo').textContent = name
      ? `${name} · ${w}×${h}`
      : 'Chart uji bawaan · seret & lepas gambar Anda sendiri ke sini';
    fitCanvas();
    renderPresets();
    scheduleRender();

    // Pencocokan yang dibuat terhadap chart uji hanya sementara — ulangi untuk gambar asli
    if (state.ref && state.ref.onSample && name) runMatch('Pencocokan referensi diperbarui untuk gambar ini.');
    else paintRefStatus();
  }

  function loadImageFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setSource(img, img.naturalWidth, img.naturalHeight, file.name);
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast('Gambar tidak dapat dibuka. Gunakan JPG, PNG, atau WebP.', true);
    };
    img.src = url;
  }

  /* ---------- Chart uji bawaan ---------- */

  function makeSampleChart() {
    const W = 1200, H = 800;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = '#1f1f1f';
    x.fillRect(0, 0, W, H);

    // Spektrum rona: putih → jenuh → hitam
    const sx = 24, sy = 24, sw = W - 48, sh = 340;
    const hue = x.createLinearGradient(sx, 0, sx + sw, 0);
    for (let i = 0; i <= 12; i++) hue.addColorStop(i / 12, `hsl(${i * 30} 100% 50%)`);
    x.fillStyle = hue;
    x.fillRect(sx, sy, sw, sh);
    const top = x.createLinearGradient(0, sy, 0, sy + sh / 2);
    top.addColorStop(0, 'rgba(255,255,255,1)');
    top.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = top;
    x.fillRect(sx, sy, sw, sh / 2);
    const bot = x.createLinearGradient(0, sy + sh / 2, 0, sy + sh);
    bot.addColorStop(0, 'rgba(0,0,0,0)');
    bot.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = bot;
    x.fillRect(sx, sy + sh / 2, sw, sh / 2);

    // Color checker 6×4
    const CHECKER = [
      '#735244', '#c29682', '#627a9d', '#576c43', '#8580b1', '#67bdaa',
      '#d67e2c', '#505ba6', '#c15a63', '#5e3c6c', '#9dbc40', '#e0a32e',
      '#383d96', '#469449', '#af363c', '#e7c71f', '#bb5695', '#0885a1',
      '#f3f3f2', '#c8c8c8', '#a0a0a0', '#7a7a79', '#555555', '#343434',
    ];
    const cy = sy + sh + 24, pw = 116, ph = 64, gap = 8;
    CHECKER.forEach((col, i) => {
      x.fillStyle = col;
      x.fillRect(sx + (i % 6) * (pw + gap), cy + Math.floor(i / 6) * (ph + gap), pw, ph);
    });

    // Warna kulit + gradien senja
    const kx = sx + 6 * (pw + gap) + 16, kw = W - 24 - kx;
    const SKIN = ['#ffe0c4', '#f1c2a7', '#e0ac8a', '#c68667', '#a16648', '#6e4330', '#46302a'];
    const skw = (kw - 6 * 6) / 7;
    SKIN.forEach((col, i) => {
      x.fillStyle = col;
      x.fillRect(kx + i * (skw + 6), cy, skw, 170);
    });
    const sky = x.createLinearGradient(kx, 0, kx + kw, 0);
    sky.addColorStop(0, '#16284d');
    sky.addColorStop(0.45, '#7b4a7a');
    sky.addColorStop(0.75, '#f08a4b');
    sky.addColorStop(1, '#ffd79a');
    x.fillStyle = sky;
    x.fillRect(kx, cy + 182, kw, 98);

    // Ramp abu halus + 11 langkah
    const gy = cy + 4 * (ph + gap) + 16;
    const ramp = x.createLinearGradient(sx, 0, sx + sw, 0);
    ramp.addColorStop(0, '#000');
    ramp.addColorStop(1, '#fff');
    x.fillStyle = ramp;
    x.fillRect(sx, gy, sw, 44);
    const stw = sw / 11;
    for (let i = 0; i < 11; i++) {
      const v = Math.round((i / 10) * 255);
      x.fillStyle = `rgb(${v},${v},${v})`;
      x.fillRect(sx + i * stw, gy + 50, Math.ceil(stw), 34);
    }
    return c;
  }

  /* ---------- Preset ---------- */

  function renderPresets() {
    const list = $('presetList');
    list.innerHTML = '';
    for (const p of PRESETS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset';
      btn.dataset.id = p.id;
      const c = document.createElement('canvas');
      c.width = THUMB_W;
      c.height = THUMB_H;
      if (state.thumb) {
        const img = new ImageData(THUMB_W, THUMB_H);
        E.applyToPixels(E.buildLUT(p.params, 17, null, soft()), state.thumb.data, img.data);
        c.getContext('2d').putImageData(img, 0, 0);
      }
      const label = document.createElement('span');
      label.textContent = p.name;
      btn.append(c, label);
      btn.addEventListener('click', () => applyPreset(p));
      list.appendChild(btn);
    }
    setActivePreset(state.activePreset);
  }

  function applyPreset(p) {
    state.params = E.mergeParams(p.params);
    if (p.id !== 'netral') $('lutName').value = 'ProLuth_' + p.name.replace(/[^\w]+/g, '_').replace(/^_|_$/g, '');
    syncUI();
    setActivePreset(p.id);
    scheduleRender();
    commit();
  }

  function setActivePreset(id) {
    state.activePreset = id;
    for (const el of document.querySelectorAll('.preset')) el.classList.toggle('active', el.dataset.id === id);
  }

  /* ---------- Cocokkan referensi ---------- */

  const MATCH = window.ProLuthMatch;

  function loadReferenceFile(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const px = MATCH.samplePixels(img, img.naturalWidth, img.naturalHeight);
      if (!px.length) {
        URL.revokeObjectURL(url);
        toast('Foto referensi kosong atau seluruhnya transparan.', true);
        return;
      }
      if (state.ref) URL.revokeObjectURL(state.ref.url);
      state.ref = { name: file.name, url, px, fit: null };
      $('refImg').src = url;
      $('refName').textContent = file.name;
      $('refName').title = file.name;
      $('refDrop').hidden = true;
      $('refCard').hidden = false;
      runMatch(state.sourceName
        ? 'Warna & tonal disesuaikan dengan referensi.'
        : 'Referensi diterapkan ke chart uji — buka gambar Anda untuk hasil sebenarnya.');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast('Foto referensi tidak dapat dibuka. Gunakan JPG, PNG, atau WebP.', true);
    };
    img.src = url;
  }

  // Hitung ulang dari gambar saat ini; parameter lain direset kecuali intensitas
  function runMatch(message) {
    const r = state.ref;
    if (!r) return;
    r.fit = MATCH.fit(MATCH.samplePixels(state.source, state.sourceW, state.sourceH), r.px, state.base, soft());
    r.sourceId = state.sourceId;
    r.base = state.base;
    r.srcType = state.srcType;
    r.onSample = !state.sourceName;
    const intensity = state.params.intensity;
    state.params = E.mergeParams(MATCH.toParams(r.fit, state.match.tone / 100, state.match.color / 100));
    state.params.intensity = intensity;
    const stem = r.name.replace(/\.[^.]+$/, '').replace(/[^\w]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
    $('lutName').value = 'ProLuth_Ref_' + (stem || 'Match');
    syncUI();
    setActivePreset(null);
    scheduleRender();
    commit();
    paintRefStatus();
    if (message) toast(message);
  }

  // Slider kekuatan hanya mengubah kurva & saturasi; penyesuaian manual lain tetap
  function applyMatchStrength() {
    const r = state.ref;
    if (!r || !r.fit) return;
    const m = MATCH.toParams(r.fit, state.match.tone / 100, state.match.color / 100);
    state.params.saturation = m.saturation;
    state.params.curves = m.curves;
    syncUI();
    setActivePreset(null);
    scheduleRender();
  }

  function removeReference() {
    URL.revokeObjectURL(state.ref.url);
    state.ref = null;
    $('refImg').removeAttribute('src');
    $('refCard').hidden = true;
    $('refDrop').hidden = false;
    toast('Referensi dilepas — penyesuaian yang sudah diterapkan tetap dipertahankan.');
  }

  function paintRefStatus() {
    const r = state.ref;
    if (!r || !r.fit) return;
    const changed = r.sourceId !== state.sourceId ? 'Gambar sumber'
      : r.base !== state.base ? 'LUT dasar'
      : r.srcType !== state.srcType ? 'Jenis gambar' : '';
    const el = $('refStatus');
    el.classList.toggle('stale', !!changed);
    el.textContent = changed
      ? `${changed} berubah sejak pencocokan — klik Cocokkan ulang untuk menyesuaikan lagi.`
      : r.onSample
        ? 'Saat ini dicocokkan ke chart uji. Buka gambar Anda dan pencocokan akan diulang otomatis.'
        : 'Atur seberapa kuat tonal & warna referensi diterapkan. Hasilnya tetap bisa disempurnakan di panel lain.';
    $('btnRematch').classList.toggle('primary', !!changed);
  }

  function makeMatchSlider(key, label) {
    const spec = { min: 0, max: 100 };
    const el = document.createElement('div');
    el.className = 'ctl';
    el.innerHTML = ctlMarkup('s-match-' + key, label, spec);
    el.title = 'Klik dua kali untuk kembali ke 100%';
    const input = el.querySelector('input');
    const output = el.querySelector('output');
    const paint = () => {
      const v = state.match[key];
      input.value = v;
      output.textContent = v + '%';
      el.classList.toggle('changed', v !== 100);
      input.style.setProperty('--trk', fillTrack(spec, v));
    };
    const set = (v) => { state.match[key] = v; paint(); applyMatchStrength(); };
    input.addEventListener('input', () => set(parseInt(input.value, 10)));
    input.addEventListener('change', commit);
    const reset = () => { set(100); commit(); };
    input.addEventListener('dblclick', reset);
    el.querySelector('label').addEventListener('dblclick', reset);
    paint();
    return el;
  }

  /* ---------- Jenis gambar sumber ---------- */

  const SRC_HINT = {
    normal: 'Foto/video yang sudah berwarna jadi. Dorongan highlight dilembutkan agar detail terang tidak hilang.',
    raw: 'Gambar datar (Log, Flat, atau RAW yang di-develop datar). Semua penyesuaian bekerja penuh.',
  };

  function setSrcType(type) {
    state.srcType = type;
    setSegmented($('srcType'), $('srcType').querySelector(`button[data-type="${type}"]`));
    $('srcTypeHint').textContent = SRC_HINT[type];
    renderPresets();
    paintRefStatus();
    scheduleRender();
  }

  $('srcType').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-type]');
    if (b && b.dataset.type !== state.srcType) setSrcType(b.dataset.type);
  });

  /* ---------- Kurva ---------- */

  let curveChannel = 'rgb';
  const curve = new window.CurveEditor($('curveCanvas'), {
    onChange: () => { setActivePreset(null); scheduleRender(); },
    onCommit: commit,
  });

  $('curveChannel').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-ch]');
    if (!b) return;
    curveChannel = b.dataset.ch;
    setSegmented($('curveChannel'), b);
    curve.setChannel(curveChannel);
  });

  $('btnResetCurve').addEventListener('click', () => {
    state.params.curves[curveChannel] = [[0, 0], [1, 1]];
    curve.setCurves(state.params.curves);
    setActivePreset(null);
    scheduleRender();
    commit();
  });

  function setSegmented(group, active) {
    for (const b of group.querySelectorAll('button')) {
      const on = b === active;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', String(on));
    }
  }

  /* ---------- Perbandingan sebelum/sesudah ---------- */

  $('compareMode').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mode]');
    if (!b) return;
    state.compare = b.dataset.mode;
    setSegmented($('compareMode'), b);
    draw();
  });

  let splitDrag = false;
  const splitFromEvent = (e) => {
    const r = wrap.getBoundingClientRect();
    state.split = clamp((e.clientX - r.left) / r.width, 0, 1);
    draw();
  };
  wrap.addEventListener('pointerdown', (e) => {
    if (!state.orig) return;
    wrap.setPointerCapture(e.pointerId);
    if (state.compare === 'split') {
      splitDrag = true;
      splitFromEvent(e);
    } else if (state.compare === 'after') {
      state.peek = true; // tahan klik untuk melihat versi asli
      draw();
    }
  });
  wrap.addEventListener('pointermove', (e) => { if (splitDrag) splitFromEvent(e); });
  const endPointer = () => {
    splitDrag = false;
    if (state.peek) { state.peek = false; draw(); }
  };
  wrap.addEventListener('pointerup', endPointer);
  wrap.addEventListener('pointercancel', endPointer);

  /* ---------- Impor / ekspor ---------- */

  function sanitizeFileName(name) {
    return name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').trim() || 'ProLuth_LUT';
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function exportCube() {
    const size = parseInt($('lutSize').value, 10);
    const name = $('lutName').value.trim() || 'ProLuth_LUT';
    const lut = E.buildLUT(state.params, size, state.base, soft());
    const text = E.toCube(lut, name);
    download(new Blob([text], { type: 'text/plain' }), sanitizeFileName(name) + '.cube');
    toast(`${sanitizeFileName(name)}.cube diunduh — LUT 3D ${size}³`);
  }

  function exportImage() {
    if (!state.source) return;
    const w = state.sourceW, h = state.sourceH;
    if (w * h > 60e6) {
      toast('Gambar terlalu besar untuk diproses di browser (maks. ±60 MP).', true);
      return;
    }
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(state.source, 0, 0, w, h);
    const img = x.getImageData(0, 0, w, h);
    E.applyToPixels(E.buildLUT(state.params, 65, state.base, soft()), img.data, img.data);
    x.putImageData(img, 0, 0);
    const baseName = (state.sourceName || 'chart-uji').replace(/\.[^.]+$/, '');
    c.toBlob((blob) => {
      if (!blob) return toast('Gagal menyimpan gambar.', true);
      download(blob, sanitizeFileName(baseName) + '_graded.jpg');
      toast(`Gambar ${w}×${h} disimpan.`);
    }, 'image/jpeg', 0.92);
  }

  function importCubeFile(file) {
    file.text().then((text) => {
      const lut = E.parseCube(text);
      state.base = lut;
      state.baseName = lut.title || file.name.replace(/\.cube$/i, '');
      $('baseName').textContent = `${state.baseName} (${lut.size}³)`;
      $('baseChip').hidden = false;
      scheduleRender();
      paintRefStatus();
      toast('LUT dimuat sebagai dasar — penyesuaian Anda ditumpuk di atasnya.');
    }).catch((err) => toast('Gagal membaca .cube: ' + err.message, true));
  }

  function handleFiles(files) {
    for (const f of files) {
      if (/\.cube$/i.test(f.name)) importCubeFile(f);
      else if (f.type.startsWith('image/')) loadImageFile(f);
      else toast(`"${f.name}" tidak didukung. Gunakan gambar atau file .cube.`, true);
    }
  }

  function updateSizeInfo() {
    const n = parseInt($('lutSize').value, 10);
    const pts = n * n * n;
    const kb = (pts * 27) / 1024;
    $('sizeInfo').textContent = `${pts.toLocaleString('id-ID')} titik warna · ±${kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.round(kb) + ' KB'}`;
  }

  /* ---------- Toast ---------- */

  let toastTimer = 0;
  function toast(msg, isError) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.toggle('error', !!isError);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), isError ? 4500 : 2800);
  }

  /* ---------- Event global ---------- */

  $('btnOpenImage').addEventListener('click', () => $('fileImage').click());
  $('btnImportCube').addEventListener('click', () => $('fileCube').click());
  $('fileImage').addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
  $('fileCube').addEventListener('change', (e) => { handleFiles(e.target.files); e.target.value = ''; });
  $('btnExport').addEventListener('click', exportCube);
  $('btnExportTop').addEventListener('click', exportCube);
  $('btnExportImage').addEventListener('click', exportImage);
  $('btnUndo').addEventListener('click', () => stepHistory(-1));
  $('btnRedo').addEventListener('click', () => stepHistory(1));
  $('lutSize').addEventListener('change', updateSizeInfo);
  $('btnRemoveBase').addEventListener('click', () => {
    state.base = null;
    $('baseChip').hidden = true;
    scheduleRender();
    paintRefStatus();
    toast('LUT dasar dilepas.');
  });
  $('btnResetAll').addEventListener('click', () => {
    state.params = E.defaultParams();
    syncUI();
    setActivePreset('netral');
    scheduleRender();
    commit();
  });

  $('refDrop').addEventListener('click', () => $('fileRef').click());
  $('btnChangeRef').addEventListener('click', () => $('fileRef').click());
  $('fileRef').addEventListener('change', (e) => {
    if (e.target.files[0]) loadReferenceFile(e.target.files[0]);
    e.target.value = '';
  });
  $('btnRemoveRef').addEventListener('click', removeReference);
  $('btnRematch').addEventListener('click', () => runMatch('Dicocokkan ulang ke gambar saat ini.'));

  let dragDepth = 0;
  const endDrag = () => { dragDepth = 0; stage.classList.remove('dragging'); };
  window.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; stage.classList.add('dragging'); });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('dragleave', () => { if (--dragDepth <= 0) endDrag(); });
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    endDrag();
    if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  });

  // Gambar yang dilepas di area referensi menjadi referensi, bukan gambar sumber
  for (const zone of [$('refDrop'), $('refThumb')]) {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
    zone.addEventListener('dragleave', (e) => { if (!zone.contains(e.relatedTarget)) zone.classList.remove('over'); });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('over');
      endDrag();
      const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'));
      if (file) loadReferenceFile(file);
      else toast('Seret file gambar (JPG, PNG, WebP) sebagai referensi.', true);
    });
  }

  window.addEventListener('keydown', (e) => {
    const typing = e.target.matches('input[type="text"], select');
    const mod = e.metaKey || e.ctrlKey;
    if (mod && !typing && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      stepHistory(e.shiftKey ? 1 : -1);
    } else if (mod && !typing && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      stepHistory(1);
    } else if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      exportCube();
    } else if (e.key === '\\' && !typing && !e.repeat) {
      state.peek = true;
      draw();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === '\\' && state.peek) { state.peek = false; draw(); }
  });

  new ResizeObserver(fitCanvas).observe(stage);

  /* ---------- Mulai ---------- */

  buildControls();
  $('refSliders').append(makeMatchSlider('tone', 'Tonal'), makeMatchSlider('color', 'Warna'));
  setSrcType(state.srcType);
  syncUI();
  updateSizeInfo();
  commit();
  const chart = makeSampleChart();
  setSource(chart, chart.width, chart.height, '');
})();
