import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { checkRateLimit, VOTE_LIMIT } from '@/lib/rateLimit';

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
    const rateLimitResult = checkRateLimit(`${ip}:vote`, VOTE_LIMIT);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Too many votes. Please slow down.',
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

    const { reportId, voteType, newExpiresAt, voterFingerprint } = body;

    if (!reportId || typeof reportId !== 'string') {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    if (voteType !== 'confirm' && voteType !== 'deny') {
      return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 });
    }

    // Try atomic RPC first (prevents race condition + server-side dedup)
    const { error: rpcError } = await supabaseAdmin.rpc('vote_on_report', {
      p_report_id: reportId,
      p_vote_type: voteType,
      p_new_expires_at: voteType === 'confirm' ? newExpiresAt : null,
      p_voter_fingerprint: voterFingerprint || `ip_${ip}`,
    });

    // If RPC says already voted (unique constraint violation)
    if (rpcError?.code === '23505') {
      return NextResponse.json(
        { error: 'You have already voted on this report.', alreadyVoted: true },
        { status: 409 }
      );
    }

    // If RPC function doesn't exist, fall back to direct update
    if (rpcError?.code === '42883') {
      // Fetch current report to compute new values
      const { data: report, error: fetchError } = await supabaseAdmin
        .from('reports')
        .select('confirmations, denials')
        .eq('id', reportId)
        .single();

      if (fetchError || !report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('reports')
        .update({
          confirmations: voteType === 'confirm' ? report.confirmations + 1 : report.confirmations,
          denials: voteType === 'deny' ? report.denials + 1 : report.denials,
          ...(voteType === 'confirm' && newExpiresAt ? { expires_at: newExpiresAt } : {}),
        })
        .eq('id', reportId);

      if (updateError) {
        console.error('Vote update error:', updateError);
        return NextResponse.json({ error: 'Vote failed' }, { status: 500 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (rpcError) {
      console.error('Vote RPC error:', rpcError);
      return NextResponse.json({ error: 'Vote failed' }, { status: 500 });
    }

    return NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: {
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        },
      }
    );
  } catch (err) {
    console.error('Vote API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
