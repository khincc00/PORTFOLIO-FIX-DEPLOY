import { ImageResponse } from 'next/og'

// Google shows favicons in search results; it asks for a square of at least 48px
export const size = { width: 96, height: 96 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#171817',
          borderRadius: 20,
          position: 'relative',
        }}
      >
        <div style={{ color: '#f8f8f6', fontSize: 66, fontWeight: 700, letterSpacing: -4, marginTop: -4 }}>K</div>
        <div style={{ position: 'absolute', right: 16, bottom: 18, width: 14, height: 14, borderRadius: 7, background: '#e65c3a' }} />
      </div>
    ),
    size
  )
}
