-- ============================================
-- PAYMENTS TABLE
-- Stores payment transaction records for all providers
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  session_id TEXT NOT NULL,
  transaction_id TEXT,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'dzd',
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider);

-- Auto-update updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments (via booking)
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT USING (
    auth.uid() IN (
      SELECT client_id FROM bookings WHERE bookings.id = payments.booking_id
    )
    OR
    auth.uid() IN (
      SELECT professional_id FROM bookings WHERE bookings.id = payments.booking_id
    )
  );

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access"
  ON payments FOR ALL USING (
    auth.role() = 'service_role'
  );

-- Allow authenticated users to insert (creating payment records)
CREATE POLICY "Authenticated users can create payments"
  ON payments FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT client_id FROM bookings WHERE bookings.id = payments.booking_id
    )
  );
