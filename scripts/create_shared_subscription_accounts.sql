-- Supabase SQL Migration: shared_subscription_accounts
-- Purpose: Store admin-assigned shared subscription email credentials for customers

CREATE TABLE IF NOT EXISTS public.shared_subscription_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL DEFAULT 'Adobe Creative Cloud',
  email_address TEXT NOT NULL,
  password TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for high-performance query lookups
CREATE INDEX IF NOT EXISTS idx_shared_sub_accounts_user_id ON public.shared_subscription_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_sub_accounts_email_address ON public.shared_subscription_accounts(email_address);

-- Enable Row Level Security (RLS)
ALTER TABLE public.shared_subscription_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow admins and service role full control
CREATE POLICY "Service role full access on shared_subscription_accounts"
  ON public.shared_subscription_accounts
  FOR ALL
  USING (true);

-- Allow authenticated users to view their own assigned accounts
CREATE POLICY "Users can view their own assigned accounts"
  ON public.shared_subscription_accounts
  FOR SELECT
  USING (auth.uid() = user_id);
