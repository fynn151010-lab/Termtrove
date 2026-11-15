-- Independent PostgreSQL schema. All writes are authorized by Supabase auth.uid().
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (length(display_name) between 1 and 60),
 school text not null default '' check (length(school)<=120),
 created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy profile_read_self on public.profiles for select to authenticated using(id=auth.uid());
create policy profile_update_self on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
revoke all on public.profiles from anon, authenticated;
grant select,update(display_name,school) on public.profiles to authenticated;
create view public.public_sellers with (security_barrier=true) as select id,display_name from public.profiles;
revoke all on public.public_sellers from anon,authenticated;
grant select on public.public_sellers to anon,authenticated;
create function public.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'Book lover'),60));
 return new;
end;$$;
create trigger create_marketplace_profile after insert on auth.users for each row execute function public.on_signup();

create table public.listings (
 id uuid primary key default gen_random_uuid(), seller_id uuid references public.profiles(id),
 title text not null check(length(title) between 1 and 200), author text not null check(length(author) between 1 and 200),
 subject text not null check(length(subject) between 1 and 80), curriculum text not null default 'Other' check(length(curriculum)<=80),
 condition text not null check(condition in ('Like New','Good','Fair','Acceptable')),
 price integer not null check(price between 1 and 10000000), original_price integer check(original_price>=price and original_price<=100000000),
 isbn text not null default '' check(length(isbn)<=30), publisher text not null default '' check(length(publisher)<=150),
 edition text not null default '' check(length(edition)<=80), description text not null check(length(description) between 10 and 5000),
 fulfilment text not null default 'Collection in Bangkok' check(length(fulfilment) between 1 and 300),
 status text not null default 'available' check(status in ('available','reserved','sold','archived')),
 reservation_id uuid, is_demo boolean not null default false, created_at timestamptz not null default now(),
 constraint seller_required check((is_demo and seller_id is null) or (not is_demo and seller_id is not null))
);
create index listing_filters on public.listings(status,curriculum,subject,price);
create index listing_seller on public.listings(seller_id,created_at desc);
create index listing_search on public.listings using gin (to_tsvector('simple',title||' '||author||' '||isbn||' '||subject||' '||curriculum));
alter table public.listings enable row level security;
create policy listing_read on public.listings for select to anon,authenticated using(status<>'archived' or seller_id=auth.uid());
revoke all on public.listings from anon,authenticated;
grant select on public.listings to anon,authenticated;

create table public.images (
 id uuid primary key, owner_id uuid not null references public.profiles(id),
 listing_id uuid references public.listings(id), object_key text not null unique,
 position integer not null default 0, created_at timestamptz not null default now(),
 check(object_key=owner_id::text||'/'||id::text)
);
create index images_listing on public.images(listing_id,position,created_at);
alter table public.images enable row level security;
create policy image_read on public.images for select to anon,authenticated using(owner_id=auth.uid() or exists(select 1 from public.listings l where l.id=listing_id and l.status<>'archived'));
create policy image_upload on public.images for insert to authenticated with check(owner_id=auth.uid() and listing_id is null);
revoke all on public.images from anon,authenticated;
grant select on public.images to anon,authenticated;
grant insert(id,owner_id,object_key) on public.images to authenticated;

create view public.marketplace_listings with (security_invoker=true) as
 select l.*,coalesce((select s.display_name from public.public_sellers s where s.id=l.seller_id),'TermTrove · sample') seller_name,
 (select i.id from public.images i where i.listing_id=l.id order by i.position,i.created_at,i.id limit 1) image_id from public.listings l;
grant select on public.marketplace_listings to anon,authenticated;

create table public.orders (
 id uuid primary key default gen_random_uuid(), reference text not null unique,
 listing_id uuid not null references public.listings(id), buyer_id uuid not null references public.profiles(id),seller_id uuid not null references public.profiles(id),
 price integer not null check(price>0),title text not null,
 status text not null default 'pending' check(status in ('pending','completed','cancelled')),
 payment_status text not null default 'due_on_collection' check(payment_status in ('due_on_collection','paid_on_collection','cancelled')),
 fulfilment text not null,collection_note text not null check(length(collection_note) between 1 and 1000),created_at timestamptz not null default now(),check(buyer_id<>seller_id)
);
create unique index one_active_order on public.orders(listing_id) where status<>'cancelled';
create index orders_buyer on public.orders(buyer_id,created_at desc);
create index orders_seller on public.orders(seller_id,created_at desc);
alter table public.orders enable row level security;
create policy order_participants on public.orders for select to authenticated using(buyer_id=auth.uid() or seller_id=auth.uid());
revoke all on public.orders from anon,authenticated;
grant select on public.orders to authenticated;

create table public.order_messages (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),sender_id uuid not null references public.profiles(id),
 message text not null check(length(message) between 1 and 1000),created_at timestamptz not null default now()
);
create index order_messages_order on public.order_messages(order_id,created_at);
alter table public.order_messages enable row level security;
create policy conversation_read on public.order_messages for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.buyer_id=auth.uid() or o.seller_id=auth.uid())));
create policy conversation_write on public.order_messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.orders o where o.id=order_id and o.status='pending' and (o.buyer_id=auth.uid() or o.seller_id=auth.uid())));
revoke all on public.order_messages from anon,authenticated;
grant select on public.order_messages to authenticated;
grant insert(order_id,sender_id,message) on public.order_messages to authenticated;

create table public.contact_messages (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),name text not null check(length(name) between 1 and 100),
 email text not null check(length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 message text not null check(length(message) between 1 and 5000),created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
create policy contact_write_self on public.contact_messages for insert to authenticated with check(user_id=auth.uid());
revoke all on public.contact_messages from anon,authenticated;
grant insert(id,user_id,name,email,message) on public.contact_messages to authenticated;

-- Complete listing updates, including photo ownership, in one transaction.
create function public.save_listing(p_data jsonb,p_image_ids uuid[],p_listing_id uuid default null) returns uuid
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
 select count(*) into v_count from public.images i join storage.objects o on o.name=i.object_key and o.bucket_id='book-images' where i.id=any(p_image_ids) and i.owner_id=v_uid and (i.listing_id is null or i.listing_id=v_id);
 if v_count<>cardinality(p_image_ids) then raise exception 'Use your own uploaded photos.' using errcode='42501';end if;
 insert into public.listings(id,seller_id,title,author,subject,curriculum,condition,price,original_price,isbn,publisher,edition,description,fulfilment)
 values(v_id,v_uid,trim(p_data->>'title'),trim(p_data->>'author'),trim(p_data->>'subject'),coalesce(p_data->>'curriculum','Other'),p_data->>'condition',(p_data->>'price')::integer,(p_data->>'original_price')::integer,coalesce(p_data->>'isbn',''),coalesce(p_data->>'publisher',''),coalesce(p_data->>'edition',''),trim(p_data->>'description'),coalesce(p_data->>'fulfilment','Collection in Bangkok'))
 on conflict(id) do update set title=excluded.title,author=excluded.author,subject=excluded.subject,curriculum=excluded.curriculum,condition=excluded.condition,price=excluded.price,original_price=excluded.original_price,isbn=excluded.isbn,publisher=excluded.publisher,edition=excluded.edition,description=excluded.description,fulfilment=excluded.fulfilment;
 update public.images set listing_id=null where listing_id=v_id;
 update public.images i set listing_id=v_id,position=photos.ordinality::integer from unnest(p_image_ids) with ordinality as photos(id,ordinality) where i.id=photos.id;
 return v_id;
end;$$;

create function public.change_listing_status(p_listing_id uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
declare v_listing public.listings;
begin
 if auth.uid() is null then raise exception 'Please sign in.' using errcode='42501';end if;
 if p_status not in ('archived','sold') then raise exception 'Invalid listing action.' using errcode='22023';end if;
 select * into v_listing from public.listings where id=p_listing_id for update;
 if not found or v_listing.seller_id is distinct from auth.uid() then raise exception 'This listing belongs to another seller.' using errcode='42501';end if;
 if v_listing.status<>'available' then raise exception 'Only available listings can be changed.' using errcode='P0001';end if;
 update public.listings set status=p_status where id=p_listing_id;
end;$$;

create function public.place_order(p_listing_id uuid,p_collection_note text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_book public.listings;v_id uuid:=gen_random_uuid();v_reference text:='TT-'||upper(replace(gen_random_uuid()::text,'-',''));v_uid uuid:=auth.uid();
begin
 if v_uid is null then raise exception 'Please sign in.' using errcode='42501';end if;
 if coalesce(length(trim(p_collection_note)),0) not between 1 and 1000 then raise exception 'Add a collection message.' using errcode='22023';end if;
 select * into v_book from public.listings where id=p_listing_id for update;
 if not found or v_book.status<>'available' then raise exception 'This book is no longer available.' using errcode='P0001';end if;
 if v_book.seller_id=v_uid then raise exception 'You cannot purchase your own book.' using errcode='22023';end if;
 if v_book.is_demo then raise exception 'This is a sample listing, not a book for sale.' using errcode='22023';end if;
 update public.listings set status='reserved',reservation_id=v_id where id=p_listing_id;
 insert into public.orders(id,reference,listing_id,buyer_id,seller_id,price,title,fulfilment,collection_note)
 values(v_id,v_reference,v_book.id,v_uid,v_book.seller_id,v_book.price,v_book.title,v_book.fulfilment,trim(p_collection_note));
 return jsonb_build_object('id',v_id,'reference',v_reference);
end;$$;

create function public.change_order_status(p_order_id uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
declare v_order public.orders;
begin
 if auth.uid() is null then raise exception 'Please sign in.' using errcode='42501';end if;
 if p_status not in ('cancelled','completed') then raise exception 'Invalid order action.' using errcode='22023';end if;
 select * into v_order from public.orders where id=p_order_id for update;
 if not found or (v_order.buyer_id<>auth.uid() and v_order.seller_id<>auth.uid()) then raise exception 'Order not found.' using errcode='42501';end if;
 if v_order.status<>'pending' then raise exception 'This order has already been updated.' using errcode='P0001';end if;
 if p_status='completed' and v_order.seller_id<>auth.uid() then raise exception 'Only the seller can confirm collection.' using errcode='42501';end if;
 update public.orders set status=p_status,payment_status=case when p_status='completed' then 'paid_on_collection' else 'cancelled' end where id=p_order_id;
 update public.listings set status=case when p_status='completed' then 'sold' else 'available' end,reservation_id=null where id=v_order.listing_id and reservation_id=v_order.id;
end;$$;

-- Private storage: only the uploader or viewers of an attached public listing can read.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('book-images','book-images',false,3145728,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy book_photo_upload on storage.objects for insert to authenticated with check(bucket_id='book-images' and (storage.foldername(name))[1]=auth.uid()::text);
create policy book_photo_read on storage.objects for select to anon,authenticated using(bucket_id='book-images' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.images i join public.listings l on l.id=i.listing_id where i.object_key=name and l.status<>'archived')));
create policy book_photo_delete_own on storage.objects for delete to authenticated using(bucket_id='book-images' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.images i where i.object_key=name and i.listing_id is not null));

revoke all on function public.on_signup() from public;
revoke all on function public.save_listing(jsonb,uuid[],uuid) from public;
revoke all on function public.change_listing_status(uuid,text) from public;
revoke all on function public.place_order(uuid,text) from public;
revoke all on function public.change_order_status(uuid,text) from public;
grant execute on function public.save_listing(jsonb,uuid[],uuid),public.change_listing_status(uuid,text),public.place_order(uuid,text),public.change_order_status(uuid,text) to authenticated;
