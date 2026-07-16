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
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const authorization = req.headers.get('Authorization')
    const token = authorization?.replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Authentication required' }, 401)

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authClient = createClient(url, anonKey)
    const adminClient = createClient(url, serviceKey)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) return json({ error: 'Invalid session' }, 401)

    const body = await req.json()
    const userId = typeof body.user_id === 'string' ? body.user_id : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const type = typeof body.type === 'string' ? body.type : 'system'
    const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {}
    if (!userId || !title || !message || title.length > 160 || message.length > 2000) {
      return json({ error: 'Invalid notification payload' }, 400)
    }

    let authorized = user.id === userId
    if (!authorized) {
      const { data: caller } = await adminClient
        .from('profiles')
        .select('user_role')
        .eq('id', user.id)
        .single()
      authorized = caller?.user_role === 'admin'
    }

    if (!authorized && typeof metadata.booking_id === 'string') {
      const { data: booking } = await adminClient
        .from('bookings')
        .select('client_id, professional_id')
        .eq('id', metadata.booking_id)
        .single()
      if (booking) {
        const participants = [booking.client_id, booking.professional_id]
        authorized = participants.includes(user.id) && participants.includes(userId)
      }
    }

    if (!authorized && typeof metadata.conversation_id === 'string') {
      const { data: members } = await adminClient
        .from('conversation_members')
        .select('user_id')
        .eq('conversation_id', metadata.conversation_id)
      const memberIds = (members || []).map(member => member.user_id)
      authorized = memberIds.includes(user.id) && memberIds.includes(userId)
    }

    if (!authorized) return json({ error: 'Not authorized for this recipient' }, 403)

    const { error } = await adminClient.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      metadata,
      read: false,
    })
    if (error) throw error
    return json({ success: true })
  } catch (error) {
    console.error('send-notification failed', error)
    return json({ error: 'Unable to send notification' }, 500)
  }
})
