import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { checkRateLimit, MESSAGE_LIMIT } from '@/lib/rateLimit';
import { Filter } from 'bad-words';

const profanityFilter = new Filter();

const MAX_MESSAGE_LENGTH = 100;
const MAX_USERNAME_LENGTH = 30;

/**
 * Extract client IP from request headers.
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
    const rateLimitResult = checkRateLimit(`${ip}:message`, MESSAGE_LIMIT);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many messages. Please slow down.',
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

    const { text, username } = body;

    // Validate text
    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    const trimmedText = text.trim();
    if (trimmedText.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` },
        { status: 400 }
      );
    }

    if (profanityFilter.isProfane(trimmedText)) {
      return NextResponse.json(
        { error: 'Please keep the chat respectful. Profane language is not allowed.' },
        { status: 400 }
      );
    }

    // Validate username
    if (typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length > MAX_USERNAME_LENGTH) {
      return NextResponse.json({ error: 'Username too long' }, { status: 400 });
    }

    // --- Insert via service role (bypasses RLS) ---
    const { data, error } = await supabaseAdmin.from('messages').insert({
      text: trimmedText,
      username: trimmedUsername,
    }).select().single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: data },
      {
        status: 201,
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );
  } catch (err) {
    console.error('Message API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
