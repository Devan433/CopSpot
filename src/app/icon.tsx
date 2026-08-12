import { ImageResponse } from 'next/og'
 
export const runtime = 'nodejs'
export const size = { width: 512, height: 512 }
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
          backgroundColor: '#0d2137',
          color: '#ff1744',
          fontSize: 300,
          borderRadius: '256px',
          border: '20px solid #14375b',
        }}
      >
        !
      </div>
    ),
    { ...size }
  )
}
