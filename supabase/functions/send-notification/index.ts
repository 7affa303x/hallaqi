import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const allowedOrigins = new Set([
  'https://www.hallaqi.app',
  'https://hallaqi.app',
  'https://hallaqi.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
])

const corsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || 'https://www.hallaqi.app'
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://www.hallaqi.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)

  try {
    const authorization = req.headers.get('Authorization')
    const token = authorization?.replace(/^Bearer\s+/i, '')
    if (!token) return json(req, { error: 'Authentication required' }, 401)

    const url = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const authClient = createClient(url, anonKey)
    const adminClient = createClient(url, serviceKey)
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) return json(req, { error: 'Invalid session' }, 401)

    const body = await req.json()
    const userId = typeof body.user_id === 'string' ? body.user_id : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const type = typeof body.type === 'string' ? body.type : 'system'
    const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {}
    if (!userId || !title || !message || title.length > 160 || message.length > 2000) {
      return json(req, { error: 'Invalid notification payload' }, 400)
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

    if (!authorized) return json(req, { error: 'Not authorized for this recipient' }, 403)

    const { data: notification, error } = await adminClient.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      metadata,
      read: false,
    }).select('id').single()
    if (error) throw error

    let delivered = 0
    const vapidSubject = Deno.env.get('VAPID_SUBJECT')
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    if (vapidSubject && vapidPublicKey && vapidPrivateKey) {
      const { data: settings } = await adminClient
        .from('user_settings')
        .select('notification_preferences')
        .eq('user_id', userId)
        .maybeSingle()
      const preferences = settings?.notification_preferences as { pushEnabled?: boolean } | null
      if (preferences?.pushEnabled !== false) {
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
        const { data: subscriptions } = await adminClient
          .from('push_subscriptions')
          .select('id, endpoint, p256dh, auth')
          .eq('user_id', userId)

        const destination = typeof metadata.booking_id === 'string'
          ? '/?screen=notifications'
          : typeof metadata.post_id === 'string'
            ? `/post/${metadata.post_id}`
            : '/?screen=notifications'
        const payload = JSON.stringify({
          title,
          body: message,
          tag: `hallaqi-${type}-${notification.id}`,
          url: destination,
        })

        for (const subscription of subscriptions || []) {
          try {
            await webpush.sendNotification({
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            }, payload, { TTL: type === 'booking' ? 86400 : 3600 })
            delivered += 1
          } catch (pushError) {
            const statusCode = typeof pushError === 'object' && pushError && 'statusCode' in pushError
              ? Number(pushError.statusCode)
              : 0
            if (statusCode === 404 || statusCode === 410) {
              await adminClient.from('push_subscriptions').delete().eq('id', subscription.id)
            } else {
              console.error('Web Push delivery failed', { subscriptionId: subscription.id, statusCode })
            }
          }
        }
      }
    }

    return json(req, { success: true, delivered })
  } catch (error) {
    console.error('send-notification failed', error)
    return json(req, { error: 'Unable to send notification' }, 500)
  }
})
