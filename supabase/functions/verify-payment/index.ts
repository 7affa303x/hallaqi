// Edge Function: Verify Payment Status
// Called after user returns from checkout to verify payment was successful
// Deploy with: supabase functions deploy verify-payment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const authorization = req.headers.get('Authorization')
    const token = authorization?.replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Authentication required' }, 401)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '')
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) return json({ error: 'Invalid session' }, 401)

    const { sessionId, provider } = await req.json()

    if (!sessionId) {
      return json({ error: 'sessionId is required' }, 400)
    }

    if (provider !== 'stripe') {
      return json({ error: `Provider "${provider}" verification not implemented` }, 400)
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('booking_id')
      .eq('session_id', sessionId)
      .eq('provider', 'stripe')
      .single()
    if (paymentError || !payment?.booking_id) return json({ error: 'Payment not found' }, 404)
    const { data: booking } = await supabase
      .from('bookings')
      .select('client_id')
      .eq('id', payment.booking_id)
      .single()
    if (!booking || booking.client_id !== user.id) return json({ error: 'Not authorized' }, 403)

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    const isCompleted = session.payment_status === 'paid'
    const bookingId = session.metadata?.booking_id
    if (bookingId !== payment.booking_id) return json({ error: 'Payment metadata mismatch' }, 409)

    // Map Stripe status to our status
    let status: string = 'pending'
    if (session.payment_status === 'paid') {
      status = 'completed'
    } else if (session.payment_status === 'unpaid' && session.status === 'expired') {
      status = 'failed'
    } else if (session.status === 'open') {
      status = 'processing'
    }

    // If payment is completed, ensure booking is confirmed
    if (isCompleted && bookingId) {
      // Update payment record
      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id

      const { error: updatePaymentError } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          transaction_id: paymentIntentId || session.id,
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)
      if (updatePaymentError) throw updatePaymentError

      // Confirm booking
      const { error: updateBookingError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
      if (updateBookingError) throw updateBookingError
    }

    return json({
      verified: isCompleted,
      status,
      transactionId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
      amount: session.amount_total,
      currency: session.currency,
      metadata: session.metadata,
    })
  } catch (error) {
    console.error('Verify payment error:', error)
    return json({ error: 'Verification failed' }, 500)
  }
})
