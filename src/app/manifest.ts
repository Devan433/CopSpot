import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CopSpot Radar',
    short_name: 'CopSpot',
    description: 'Community-driven radar and reporting network',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d2137',
    theme_color: '#0d2137',
    icons: [
      {
        src: '/icon',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
