-- ============================================================
-- Receipts bucket
--
-- Customers upload a bKash screenshot at checkout. The bucket is PRIVATE:
-- a public bucket would let anyone who guesses a filename read every
-- customer's payment screenshot.
--
-- Admins never read it directly either — /api/admin/receipt mints a
-- 120-second signed URL with the service role and redirects to that.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760,                                     -- 10MB, matching the UI limit
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Each customer gets their own folder, named after their user id. The first
-- path segment is compared against auth.uid(), so nobody can write into — or
-- read out of — somebody else's folder.

drop policy if exists "receipts upload own folder" on storage.objects;
create policy "receipts upload own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "receipts read own folder" on storage.objects;
create policy "receipts read own folder" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- No update or delete policy on purpose. A receipt is evidence for an order
-- that has already been submitted, so it must not be swapped or removed after
-- the fact. The service role can still clean up if it ever needs to.

commit;
