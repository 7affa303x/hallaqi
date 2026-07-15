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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { sessionId, provider } = await req.json()

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (provider !== 'stripe') {
      return new Response(
        JSON.stringify({ error: `Provider "${provider}" verification not implemented` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    const isCompleted = session.payment_status === 'paid'
    const bookingId = session.metadata?.booking_id

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

      await supabase
        .from('payments')
        .update({
          status: 'completed',
          transaction_id: paymentIntentId || session.id,
          updated_at: new Date().toISOString(),
        })
        .eq('session_id', sessionId)

      // Confirm booking
      await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
    }

    return new Response(
      JSON.stringify({
        verified: isCompleted,
        status,
        transactionId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        amount: session.amount_total,
        currency: session.currency,
        metadata: session.metadata,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Verify payment error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Verification failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
