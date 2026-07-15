// Edge Function: Stripe Webhook Handler
// Verifies webhook signature, updates payment status, and confirms bookings
// Deploy with: supabase functions deploy stripe-webhook

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

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

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    let event: Stripe.Event

    // Verify webhook signature if secret is configured
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message)
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // In test/sandbox mode without webhook secret, parse directly
      event = JSON.parse(body)
    }

    console.log(`Processing webhook event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const bookingId = session.metadata?.booking_id
        const paymentIntentId = typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id

        if (!bookingId) {
          console.error('No booking_id in session metadata')
          break
        }

        // Update payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            status: 'completed',
            transaction_id: paymentIntentId || session.id,
            updated_at: new Date().toISOString(),
            metadata: {
              payment_intent: paymentIntentId,
              payment_status: session.payment_status,
              amount_total: session.amount_total,
              currency: session.currency,
            },
          })
          .eq('session_id', session.id)

        if (paymentError) {
          console.error('Failed to update payment:', paymentError)
        }

        // Update booking status to confirmed and payment_status to paid
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', bookingId)

        if (bookingError) {
          console.error('Failed to update booking:', bookingError)
        }

        // Send notification to client
        const clientId = session.metadata?.client_id
        if (clientId) {
          await supabase.from('notifications').insert({
            user_id: clientId,
            title: 'تم تأكيد الدفع',
            message: 'تم تأكيد دفعك بنجاح وتم تأكيد حجزك',
            type: 'booking',
            read: false,
          })
        }

        // Send notification to professional
        const professionalId = session.metadata?.professional_id
        if (professionalId) {
          await supabase.from('notifications').insert({
            user_id: professionalId,
            title: 'حجز جديد مؤكد',
            message: 'تم تأكيد حجز جديد مع دفع إلكتروني',
            type: 'booking',
            read: false,
          })
        }

        console.log(`Booking ${bookingId} confirmed after payment`)
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const bookingId = session.metadata?.booking_id

        if (bookingId) {
          // Update payment record
          await supabase
            .from('payments')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('session_id', session.id)

          // Update booking payment status
          await supabase
            .from('bookings')
            .update({
              payment_status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)

          console.log(`Payment expired for booking ${bookingId}`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const bookingId = paymentIntent.metadata?.booking_id

        if (bookingId) {
          await supabase
            .from('payments')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('booking_id', bookingId)
            .eq('status', 'pending')

          await supabase
            .from('bookings')
            .update({
              payment_status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', bookingId)

          console.log(`Payment failed for booking ${bookingId}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
