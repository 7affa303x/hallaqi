export interface AuthenticatedUser {
  id: string;
  email?: string;
  accessToken: string;
}

export async function authenticateSupabaseRequest(
  request: Request
): Promise<AuthenticatedUser | null> {
  const authorization = request.headers.get('authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const apiKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !apiKey) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      authorization: `Bearer ${token}`,
      apikey: apiKey,
    },
  });
  if (!response.ok) return null;
  const user = await response.json() as { id?: unknown; email?: unknown };
  return typeof user.id === 'string'
    ? {
        id: user.id,
        email: typeof user.email === 'string' ? user.email : undefined,
        accessToken: token,
      }
    : null;
}

export async function consumeAiQuota(
  user: AuthenticatedUser,
  feature: 'advice' | 'style-image' | 'barber-assist'
): Promise<boolean> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const apiKey = process.env.VITE_SUPABASE_ANON_KEY;
  // Fail closed: never burn AI provider quota when auth/quota infra is misconfigured.
  if (!supabaseUrl || !apiKey) {
    console.error('consume_ai_quota misconfigured', { feature, userId: user.id });
    return false;
  }
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_ai_quota`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${user.accessToken}`,
        apikey: apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ai_feature: feature }),
    });
    if (!response.ok) {
      // Distinguishes infra/RPC errors from an exhausted quota (RPC returns false with 200)
      console.error('consume_ai_quota failed', { status: response.status, feature, userId: user.id });
      return false;
    }
    const allowed = await response.json();
    return allowed === true;
  } catch (error) {
    console.error('consume_ai_quota exception', error);
    return false;
  }
}
