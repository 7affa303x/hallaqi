import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authorization = req.headers.get('Authorization')
  const token = authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Authentication required' }, 401)

  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const authClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '')
  const adminClient = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  const { data: { user }, error: authError } = await authClient.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid session' }, 401)

  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('delete-account failed', error)
    return json({ error: 'Unable to delete account' }, 500)
  }
  return json({ success: true })
})
