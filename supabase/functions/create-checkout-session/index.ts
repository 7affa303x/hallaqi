// Edge Function: Create Stripe Checkout Session
// Dynamically creates products/prices from booking data (no pre-created Stripe Products)
// Deploy with: supabase functions deploy create-checkout-session

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

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

function returnUrl(base: string, values: Record<string, string>) {
  const url = new URL(base)
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value)
  return url.toString()
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)

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
    if (!token) return json(req, { error: 'Authentication required' }, 401)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '')
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    const { data: { user }, error: authError } = await authClient.auth.getUser(token)
    if (authError || !user) return json(req, { error: 'Invalid session' }, 401)

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
    if (!bookingId || !Array.isArray(lineItems) || lineItems.length === 0 || !totalAmount || !successUrl || !cancelUrl) {
      return json(req, { error: 'Missing required fields: bookingId, lineItems, totalAmount, successUrl, cancelUrl' }, 400)
    }

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('client_id, professional_id, total_price')
      .eq('id', bookingId)
      .single()
    if (bookingError || !booking) return json(req, { error: 'Booking not found' }, 404)
    if (booking.client_id !== user.id || clientId !== user.id || professionalId !== booking.professional_id) {
      return json(req, { error: 'Not authorized for this booking' }, 403)
    }
    if (Math.abs(Number(totalAmount) - Number(booking.total_price)) > 0.01) {
      return json(req, { error: 'Payment amount does not match booking' }, 400)
    }
    const lineItemsTotal = lineItems.reduce((sum: number, item: {
      amount?: number
      quantity?: number
    }) => sum + Number(item.amount || 0) * Number(item.quantity || 0), 0)
    if (!Number.isFinite(lineItemsTotal)
      || Math.abs(lineItemsTotal - Number(booking.total_price) * 100) > 1) {
      return json(req, { error: 'Line items do not match booking total' }, 400)
    }

    const allowedHosts = new Set(['hallaqi.app', 'www.hallaqi.app', 'localhost', '127.0.0.1'])
    if (!allowedHosts.has(new URL(successUrl).hostname) || !allowedHosts.has(new URL(cancelUrl).hostname)) {
      return json(req, { error: 'Invalid return URL' }, 400)
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
      success_url: returnUrl(successUrl, {
        session_id: '{CHECKOUT_SESSION_ID}',
        booking_id: bookingId,
      }),
      cancel_url: returnUrl(cancelUrl, { booking_id: bookingId }),
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
      await stripe.checkout.sessions.expire(session.id)
      throw dbError
    }

    return json(req, {
      sessionId: session.id,
      checkoutUrl: session.url,
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return json(req, { error: 'Unable to create checkout session' }, 500)
  }
})
