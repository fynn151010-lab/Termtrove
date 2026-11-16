-- Rollout step 2: apply only after the metadata-first API uploader is live.
-- Fresh local/CI environments apply both migrations before starting the API.
alter policy book_photo_upload on storage.objects with check(
 bucket_id='book-images' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.images i where i.object_key=name and i.owner_id=(select auth.uid()) and i.listing_id is null and not i.deleting)
);
alter policy book_photo_delete_own on storage.objects using(
 bucket_id='book-images' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.images i where i.object_key=name and i.owner_id=(select auth.uid()) and i.listing_id is null and i.deleting)
);
