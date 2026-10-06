-- Create otp_history table for logging all incoming OTPs & email verification requests
CREATE TABLE IF NOT EXISTS public.otp_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_address TEXT NOT NULL,
  service_name TEXT DEFAULT 'Adobe Creative Cloud',
  sender TEXT,
  subject TEXT,
  otp_code TEXT,
  full_content TEXT,
  received_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for rapid lookup by email_address and received_at timestamp
CREATE INDEX IF NOT EXISTS idx_otp_history_email_address ON public.otp_history (email_address);
CREATE INDEX IF NOT EXISTS idx_otp_history_received_at ON public.otp_history (received_at DESC);
