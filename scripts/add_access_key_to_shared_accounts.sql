-- Add access_key column to shared_subscription_accounts table
ALTER TABLE IF EXISTS public.shared_subscription_accounts 
ADD COLUMN IF NOT EXISTS access_key TEXT UNIQUE;

-- Add access_key column to user_generated_emails table
ALTER TABLE IF EXISTS public.user_generated_emails 
ADD COLUMN IF NOT EXISTS access_key TEXT UNIQUE;

-- Create index for high-speed key verification
CREATE INDEX IF NOT EXISTS idx_shared_accounts_access_key ON public.shared_subscription_accounts (access_key);
CREATE INDEX IF NOT EXISTS idx_generated_emails_access_key ON public.user_generated_emails (access_key);
