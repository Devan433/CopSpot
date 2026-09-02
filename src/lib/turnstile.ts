/**
 * Server-side Turnstile token verification.
 * Call this from API routes to validate that the request came from a real browser.
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token: string, ip?: string): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY is not set');
    return { success: false, error: 'Server misconfiguration' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (ip) formData.append('remoteip', ip);

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    return { success: data.success === true };
  } catch (err) {
    console.error('Turnstile verification failed:', err);
    return { success: false, error: 'Verification request failed' };
  }
}
