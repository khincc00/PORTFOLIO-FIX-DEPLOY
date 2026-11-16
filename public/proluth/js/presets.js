/* ProLuth — preset bawaan. Nilai yang tidak disebut memakai default. */
(function (root) {
  'use strict';

  const S_SOFT = [[0, 0], [0.25, 0.21], [0.75, 0.79], [1, 1]];
  const S_HARD = [[0, 0], [0.22, 0.15], [0.78, 0.86], [1, 1]];

  root.PROLUTH_PRESETS = [
    { id: 'netral', name: 'Netral', params: {} },
    {
      id: 'teal-orange', name: 'Teal & Orange',
      params: { contrast: 18, vibrance: 15, saturation: 5, shadowHue: 195, shadowAmt: 55, midHue: 30, midAmt: 10, highHue: 32, highAmt: 40 },
    },
    {
      id: 'film-vintage', name: 'Film Vintage',
      params: {
        fade: 35, contrast: -12, temperature: 18, saturation: -22,
        shadowHue: 215, shadowAmt: 25, highHue: 45, highAmt: 30,
        curves: { rgb: [[0, 0.04], [0.3, 0.28], [0.72, 0.76], [1, 0.94]] },
      },
    },
    {
      id: 'golden', name: 'Golden Hour',
      params: { exposure: 0.1, temperature: 40, tint: 6, highlights: -15, vibrance: 22, midHue: 30, midAmt: 15, highHue: 38, highAmt: 35 },
    },
    {
      id: 'nordic', name: 'Nordic Dingin',
      params: { temperature: -32, saturation: -18, fade: 14, contrast: 8, highlights: -10, shadowHue: 215, shadowAmt: 20, highHue: 200, highAmt: 18 },
    },
    {
      id: 'hutan', name: 'Hutan Moody',
      params: {
        exposure: -0.25, contrast: 22, shadows: -15, saturation: -28, hue: -8,
        shadowHue: 165, shadowAmt: 40, midHue: 90, midAmt: 12, highHue: 45, highAmt: 15,
      },
    },
    {
      id: 'film-hangat', name: 'Film Hangat',
      params: {
        contrast: 12, fade: 10, temperature: 12, saturation: -6,
        curves: { rgb: S_SOFT, r: [[0, 0.02], [0.5, 0.53], [1, 1]], b: [[0, 0.05], [0.5, 0.47], [1, 0.92]] },
      },
    },
    {
      id: 'pastel', name: 'Pastel Lembut',
      params: { exposure: 0.2, contrast: -25, fade: 22, saturation: -12, vibrance: 10, shadowHue: 190, shadowAmt: 18, highHue: 330, highAmt: 15 },
    },
    {
      id: 'neon', name: 'Neon Malam',
      params: { contrast: 25, saturation: 20, hue: -10, temperature: -15, shadowHue: 255, shadowAmt: 55, highHue: 320, highAmt: 35 },
    },
    {
      id: 'bleach', name: 'Bleach Bypass',
      params: { saturation: -55, contrast: 45, highlights: -12, shadows: -8, curves: { rgb: S_SOFT } },
    },
    {
      id: 'noir', name: 'Noir H/P',
      params: { saturation: -100, contrast: 35, shadows: -10, curves: { rgb: S_HARD } },
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
