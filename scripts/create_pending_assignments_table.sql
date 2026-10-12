-- Pending Assignments Table for Smart Auto-Assign System
-- Stores orders waiting for available Adobe accounts

CREATE TABLE IF NOT EXISTS public.pending_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_at TIMESTAMPTZ
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_pending_assignments_status ON public.pending_assignments(status);
CREATE INDEX IF NOT EXISTS idx_pending_assignments_created_at ON public.pending_assignments(created_at);

-- Enable Row Level Security
ALTER TABLE public.pending_assignments ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "Service role full access on pending_assignments" ON public.pending_assignments;
CREATE POLICY "Service role full access on pending_assignments"
  ON public.pending_assignments
  FOR ALL
  USING (true);
