import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
          position: 'relative',
        }}
      >
        <div style={{ color: '#f8f8f6', fontSize: 120, fontWeight: 700, letterSpacing: -6, marginTop: -8 }}>K</div>
        <div style={{ position: 'absolute', right: 34, bottom: 38, width: 24, height: 24, borderRadius: 12, background: '#e65c3a' }} />
      </div>
    ),
    size
  )
}
