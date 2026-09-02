import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { checkRateLimit, REPORT_LIMIT } from '@/lib/rateLimit';
import { MAX_DESCRIPTION_LENGTH } from '@/lib/constants';
import { Filter } from 'bad-words';

const profanityFilter = new Filter();

/**
 * Extract client IP from request headers.
 * Works with Vercel, Cloudflare, nginx, and direct connections.
 */
function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);

    // --- Rate limit check ---
    const rateLimitResult = checkRateLimit(`${ip}:report`, REPORT_LIMIT);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many reports. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // --- Parse and validate body ---
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { description, latitude, longitude } = body;

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Coordinates out of range' }, { status: 400 });
    }

    // Validate description
    const desc = typeof description === 'string' ? description.trim() : '';
    if (desc.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description too long (max ${MAX_DESCRIPTION_LENGTH} chars)` },
        { status: 400 }
      );
    }

    if (desc && profanityFilter.isProfane(desc)) {
      return NextResponse.json(
        { error: 'Please remove profane language from your description.' },
        { status: 400 }
      );
    }

    // --- Insert via service role (bypasses RLS) ---
    const { data, error } = await getSupabaseAdmin().from('reports').insert({
      description: desc || null,
      latitude,
      longitude,
      expires_at: new Date(Date.now() + 60 * 60000).toISOString(),
    }).select().single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, report: data },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );
  } catch (err) {
    console.error('Report API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
