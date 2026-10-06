-- Create user_generated_emails table
CREATE TABLE IF NOT EXISTS public.user_generated_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_address TEXT UNIQUE NOT NULL,
  prefix TEXT NOT NULL,
  service_name TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create received_email_codes table
CREATE TABLE IF NOT EXISTS public.received_email_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_email_id UUID REFERENCES public.user_generated_emails(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  sender TEXT,
  subject TEXT,
  code TEXT NOT NULL,
  otp_type TEXT DEFAULT 'verification_code',
  raw_body TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_user_generated_emails_addr ON public.user_generated_emails(email_address);
CREATE INDEX IF NOT EXISTS idx_user_generated_emails_user ON public.user_generated_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_received_email_codes_addr ON public.received_email_codes(email_address);

-- Enable RLS
ALTER TABLE public.user_generated_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.received_email_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on user_generated_emails" ON public.user_generated_emails FOR ALL USING (true);
CREATE POLICY "Service role full access on received_email_codes" ON public.received_email_codes FOR ALL USING (true);
