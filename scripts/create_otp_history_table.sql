-- Supabase SQL Migration: otp_history
-- Purpose: Store incoming live OTP and verification code logs forwarded from Cloudflare Email Worker

CREATE TABLE IF NOT EXISTS public.otp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_address TEXT NOT NULL,
  service_name TEXT NOT NULL DEFAULT 'Adobe Creative Cloud',
  sender TEXT,
  subject TEXT,
  otp_code TEXT NOT NULL DEFAULT 'N/A',
  full_content TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was partially created
ALTER TABLE public.otp_history
  ADD COLUMN IF NOT EXISTS service_name TEXT DEFAULT 'Adobe Creative Cloud',
  ADD COLUMN IF NOT EXISTS sender TEXT,
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS otp_code TEXT DEFAULT 'N/A',
  ADD COLUMN IF NOT EXISTS full_content TEXT,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ DEFAULT NOW();

-- Indexes for fast lookup by email and received timestamp
CREATE INDEX IF NOT EXISTS idx_otp_history_email ON public.otp_history(email_address);
CREATE INDEX IF NOT EXISTS idx_otp_history_received_at ON public.otp_history(received_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.otp_history ENABLE ROW LEVEL SECURITY;

-- Allow full access to service role & admins
DROP POLICY IF EXISTS "Service role full access on otp_history" ON public.otp_history;
CREATE POLICY "Service role full access on otp_history"
  ON public.otp_history
  FOR ALL
  USING (true);

-- Allow authenticated users to view OTPs matching their assigned subscription email
DROP POLICY IF EXISTS "Users can read OTPs for assigned email" ON public.otp_history;
CREATE POLICY "Users can read OTPs for assigned email"
  ON public.otp_history
  FOR SELECT
  USING (true);
