-- Update adobe_accounts table to add 'shared' status option

-- Add status column if not exists
ALTER TABLE public.adobe_accounts
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'stock'
CHECK (status IN ('stock', 'shared', 'used'));

-- Update existing accounts to 'stock' status
UPDATE public.adobe_accounts
SET status = 'stock'
WHERE status IS NULL OR status = 'available' OR status = 'unassigned';

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_adobe_accounts_status ON public.adobe_accounts(status);

-- Add index for shared accounts lookup
CREATE INDEX IF NOT EXISTS idx_adobe_accounts_shared ON public.adobe_accounts(status, is_used)
WHERE status = 'shared' AND is_used = false;
