-- Rollout step 1: add removal state and RPCs before deploying the new API.
-- Keep the original storage policies until the new metadata-first uploader is live.
alter table public.images add column deleting boolean not null default false;

create function public.request_photo_removal(p_image_id uuid) returns text
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=(select auth.uid()); v_image public.images; v_key text;
begin
 if v_uid is null then raise exception 'Please sign in.' using errcode='42501'; end if;
 if p_image_id is null then raise exception 'Choose a photo.' using errcode='22023'; end if;
 v_key:=v_uid::text||'/'||p_image_id::text;
 select * into v_image from public.images where id=p_image_id for update;
 if not found then
  -- Permit retrying cleanup of the owner's legacy, unregistered object.
  if exists(select 1 from storage.objects where bucket_id='book-images' and name=v_key) then
   insert into public.images(id,owner_id,object_key,deleting) values(p_image_id,v_uid,v_key,true);
  end if;
  return v_key;
 end if;
 if v_image.owner_id is distinct from v_uid then raise exception 'You can only remove your own photo.' using errcode='42501'; end if;
 if v_image.listing_id is not null then raise exception 'Save the listing without this photo before removing it.' using errcode='P0001'; end if;
 update public.images set deleting=true where id=p_image_id;
 return v_image.object_key;
end;$$;

create function public.finish_photo_removal(p_image_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=(select auth.uid()); v_image public.images;
begin
 if v_uid is null then raise exception 'Please sign in.' using errcode='42501'; end if;
 if p_image_id is null then raise exception 'Choose a photo.' using errcode='22023'; end if;
 select * into v_image from public.images where id=p_image_id for update;
 if not found then return; end if;
 if v_image.owner_id is distinct from v_uid then raise exception 'You can only remove your own photo.' using errcode='42501'; end if;
 if not v_image.deleting or v_image.listing_id is not null then raise exception 'This photo has not been marked for removal.' using errcode='P0001'; end if;
 if exists(select 1 from storage.objects where bucket_id='book-images' and name=v_image.object_key) then
  raise exception 'Photo removal has not finished. Please try again.' using errcode='P0001';
 end if;
 delete from public.images where id=p_image_id;
end;$$;

revoke all on function public.request_photo_removal(uuid),public.finish_photo_removal(uuid) from public,anon,authenticated;
grant execute on function public.request_photo_removal(uuid),public.finish_photo_removal(uuid) to authenticated;

-- A row marked for deletion cannot be attached while object deletion is in flight.
create or replace function public.save_listing(p_data jsonb,p_image_ids uuid[],p_listing_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_id uuid:=coalesce(p_listing_id,gen_random_uuid());v_old public.listings;v_count integer;
begin
 if v_uid is null then raise exception 'Please sign in to continue.' using errcode='42501';end if;
 if coalesce(cardinality(p_image_ids),0) not between 1 and 5 or (select count(distinct x) from unnest(p_image_ids) x)<>cardinality(p_image_ids) then raise exception 'Add between 1 and 5 different photos.' using errcode='22023';end if;
 if p_listing_id is not null then
  select * into v_old from public.listings where id=p_listing_id for update;
  if not found or v_old.seller_id is distinct from v_uid then raise exception 'You can only edit your own listing.' using errcode='42501';end if;
  if v_old.status<>'available' then raise exception 'Only available listings can be edited.' using errcode='P0001';end if;
 end if;
 perform id from public.images where id=any(p_image_ids) order by id for update;
 if exists(select 1 from public.images where id=any(p_image_ids) and owner_id=v_uid and deleting) then raise exception 'A photo is being removed. Upload it again before saving.' using errcode='22023';end if;
 select count(*) into v_count from public.images i join storage.objects o on o.name=i.object_key and o.bucket_id='book-images' where i.id=any(p_image_ids) and i.owner_id=v_uid and not i.deleting and (i.listing_id is null or i.listing_id=v_id);
 if v_count<>cardinality(p_image_ids) then raise exception 'Use your own uploaded photos.' using errcode='42501';end if;
 insert into public.listings(id,seller_id,title,author,subject,curriculum,condition,price,original_price,isbn,publisher,edition,description,fulfilment)
 values(v_id,v_uid,trim(p_data->>'title'),trim(p_data->>'author'),trim(p_data->>'subject'),coalesce(p_data->>'curriculum','Other'),p_data->>'condition',(p_data->>'price')::integer,(p_data->>'original_price')::integer,coalesce(p_data->>'isbn',''),coalesce(p_data->>'publisher',''),coalesce(p_data->>'edition',''),trim(p_data->>'description'),coalesce(p_data->>'fulfilment','Collection in Bangkok'))
 on conflict(id) do update set title=excluded.title,author=excluded.author,subject=excluded.subject,curriculum=excluded.curriculum,condition=excluded.condition,price=excluded.price,original_price=excluded.original_price,isbn=excluded.isbn,publisher=excluded.publisher,edition=excluded.edition,description=excluded.description,fulfilment=excluded.fulfilment;
 update public.images set listing_id=null where listing_id=v_id;
 update public.images i set listing_id=v_id,position=photos.ordinality::integer from unnest(p_image_ids) with ordinality as photos(id,ordinality) where i.id=photos.id;
 return v_id;
end;$$;
revoke all on function public.save_listing(jsonb,uuid[],uuid) from public,anon,authenticated;
grant execute on function public.save_listing(jsonb,uuid[],uuid) to authenticated;
