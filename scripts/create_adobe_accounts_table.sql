-- Supabase SQL Migration: adobe_accounts
-- Purpose: Store permanent Adobe account credentials with OTP tracking

CREATE TABLE IF NOT EXISTS public.adobe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  last_otp TEXT,
  last_otp_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_adobe_accounts_email ON public.adobe_accounts(email);
CREATE INDEX IF NOT EXISTS idx_adobe_accounts_is_used ON public.adobe_accounts(is_used);
CREATE INDEX IF NOT EXISTS idx_adobe_accounts_last_otp_time ON public.adobe_accounts(last_otp_time DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.adobe_accounts ENABLE ROW LEVEL SECURITY;

-- Allow full access to service role & admins
DROP POLICY IF EXISTS "Service role full access on adobe_accounts" ON public.adobe_accounts;
CREATE POLICY "Service role full access on adobe_accounts"
  ON public.adobe_accounts
  FOR ALL
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_adobe_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_adobe_accounts_updated_at_trigger ON public.adobe_accounts;
CREATE TRIGGER update_adobe_accounts_updated_at_trigger
  BEFORE UPDATE ON public.adobe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_adobe_accounts_updated_at();
