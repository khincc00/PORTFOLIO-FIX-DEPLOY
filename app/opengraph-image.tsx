/**
 * app/opengraph-image.tsx → gambar preview saat link website dibagikan.
 * Gambar 1200×630 ini dibuat dari kode (seperti menulis HTML), jadi tidak perlu desain manual.
 */
import { ImageResponse } from 'next/og'

// Muncul saat link dibagikan di WhatsApp, Instagram, X, LinkedIn, dll. `alt` = keterangan gambarnya
export const alt = 'Taufiq Sholikhin — Campaign design & short-form video for tech & gear brands'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#f8f8f6',
          color: '#171817',
          padding: '64px 80px',
          borderTop: '12px solid #e65c3a',
        }}
      >
        {/* Baris atas: nama studio dan lokasi */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, fontWeight: 700, letterSpacing: 1 }}>
          <span>KHINCC® / Studio</span>
          <span style={{ color: '#777b78', fontWeight: 500 }}>Indonesia • Fully Remote</span>
        </div>
        {/* Tengah: nama dan keahlian */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 92, fontWeight: 600, letterSpacing: -4, lineHeight: 1 }}>Taufiq Sholikhin</div>
          <div style={{ fontSize: 44, color: '#555a56', marginTop: 20, letterSpacing: -1 }}>
            Campaign design & short-form video for tech & gear brands
          </div>
        </div>
        {/* Bawah: alamat website dan akun media sosial */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 28, color: '#e65c3a', fontWeight: 600 }}>
          <div style={{ width: 14, height: 14, borderRadius: 7, background: '#e65c3a' }} />
          khincreator.com · @khinccofficial
        </div>
      </div>
    ),
    size
  )
}
