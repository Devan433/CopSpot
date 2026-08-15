# CopSpot 🚨

A community-driven, real-time cop spotter and reporting network for Kerala, India. Built as a Progressive Web App (PWA) for instant mobile access.

## Features

- **📍 Real-time Map** — See live reports on an interactive map powered by Leaflet/OpenStreetMap
- **👮 Multiple Report Types** — Report police checks, traffic issues, accidents, hazards, and more
- **✅ Community Verification** — Confirm or deny reports to keep the radar accurate
- **💬 Live Chat** — Ephemeral, real-time community chat (messages auto-expire after 3 hours)
- **📱 PWA Install** — Install directly on your phone's home screen, no app store needed
- **🔒 Profanity Filter** — Client-side content moderation on both reports and chat

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Maps | Leaflet + react-leaflet |
| Backend | Supabase (Postgres + Realtime) |
| PWA | @ducanh2912/next-pwa |

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project with `reports` and `messages` tables

### Environment Variables
Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Tables

**reports**
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, auto-generated |
| type | text | e.g., 'checking', 'traffic', 'accident', 'hazard', 'other' |
| latitude | float8 | |
| longitude | float8 | |
| description | text | Optional |
| created_at | timestamptz | Auto-generated |
| expires_at | timestamptz | Auto-generated (default: 1 hour from creation) |
| confirmations | int4 | Default: 0 |
| denials | int4 | Default: 0 |

**messages**
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, auto-generated |
| text | text | |
| username | text | |
| created_at | timestamptz | Auto-generated |

> **Important:** Enable Row Level Security (RLS) on both tables in your Supabase dashboard.

### Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your browser.

To test on your phone (same Wi-Fi network):
```bash
# Find your local IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# Then visit http://<YOUR_LOCAL_IP>:3000 on your phone
```

### Build for Production

```bash
npm run build
npm run start
```

## Deployment

Deploy to [Vercel](https://vercel.com) for the easiest setup:

```bash
npx vercel
```

## License

MIT
