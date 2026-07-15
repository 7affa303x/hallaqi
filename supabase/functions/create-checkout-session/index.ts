// Edge Function: Create Stripe Checkout Session
// Dynamically creates products/prices from booking data (no pre-created Stripe Products)
// Deploy with: supabase functions deploy create-checkout-session

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
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

    const {
      bookingId,
      clientId,
      professionalId,
      lineItems,
      totalAmount,
      currency = 'dzd',
      metadata = {},
      successUrl,
      cancelUrl,
      customerEmail,
    } = await req.json()

    // Validate required fields
    if (!bookingId || !lineItems || !totalAmount || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: bookingId, lineItems, totalAmount, successUrl, cancelUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build Stripe line items dynamically from booking data
    const stripeLineItems = lineItems.map((item: { name: string; description?: string; amount: number; quantity: number }) => ({
      price_data: {
        currency: currency.toLowerCase(),
        product_data: {
          name: item.name,
          description: item.description || undefined,
        },
        unit_amount: Math.round(item.amount), // amount in smallest unit (centimes)
      },
      quantity: item.quantity,
    }))

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: stripeLineItems,
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${cancelUrl}?booking_id=${bookingId}`,
      metadata: {
        booking_id: bookingId,
        client_id: clientId || '',
        professional_id: professionalId || '',
        ...metadata,
      },
      ...(customerEmail ? { customer_email: customerEmail } : {}),
    })

    // Save payment record to database
    const { error: dbError } = await supabase.from('payments').insert({
      booking_id: bookingId,
      provider: 'stripe',
      session_id: session.id,
      amount: totalAmount,
      currency: currency.toLowerCase(),
      status: 'pending',
      metadata: { stripe_session_url: session.url },
    })

    if (dbError) {
      console.error('Failed to save payment record:', dbError)
      // Don't fail the request - the session is created, webhook will handle status
    }

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        checkoutUrl: session.url,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
