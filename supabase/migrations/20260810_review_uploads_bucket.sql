-- Feature 4 (voice-note follow-up): a bucket students can upload review audio to.
--
-- The public `audio_reviews` bucket is admin-write-only (via signed URLs) so the
-- sales page can't be spammed. Students need somewhere to put a voice note when
-- they submit a review, so this bucket lets an AUTHENTICATED student write ONLY
-- into their own uid-prefixed folder. Public read is on so the file can play
-- back in the review sheet and, once you publish the review, on the sales page.
-- Nothing links to an upload until you promote it, and the path is unguessable
-- (uid + timestamp).
-- Run in Supabase Dashboard -> SQL Editor.

insert into storage.buckets (id, name, public)
values ('review_uploads', 'review_uploads', true)
on conflict (id) do update set public = true;

-- A student may upload only into a folder named after their own uid.
drop policy if exists "review_uploads own insert" on storage.objects;
create policy "review_uploads own insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review_uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read (the file must play back in the sheet and on the sales page).
drop policy if exists "review_uploads public read" on storage.objects;
create policy "review_uploads public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'review_uploads');

-- No update/delete from the client — uploads are immutable; you moderate with
-- the service role in the dashboard.
