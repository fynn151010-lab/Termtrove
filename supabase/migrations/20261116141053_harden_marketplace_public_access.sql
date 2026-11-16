-- Hosted Supabase projects may grant EXECUTE directly to API roles by default.
-- Revoke those grants explicitly rather than relying only on revoking PUBLIC.
revoke all on function public.on_signup() from public, anon, authenticated;
revoke all on function public.save_listing(jsonb,uuid[],uuid) from public, anon, authenticated;
revoke all on function public.change_listing_status(uuid,text) from public, anon, authenticated;
revoke all on function public.place_order(uuid,text) from public, anon, authenticated;
revoke all on function public.change_order_status(uuid,text) from public, anon, authenticated;
grant execute on function public.save_listing(jsonb,uuid[],uuid),public.change_listing_status(uuid,text),public.place_order(uuid,text),public.change_order_status(uuid,text) to authenticated;

-- Public names live in a separate, read-only projection. No view bypasses RLS
-- on the private profiles table, which also contains school/account fields.
create table public.seller_profiles (
 id uuid primary key references public.profiles(id) on delete cascade,
 display_name text not null check(length(display_name) between 1 and 60)
);
alter table public.seller_profiles enable row level security;
create policy seller_names_read on public.seller_profiles for select to anon,authenticated using(true);
revoke all on public.seller_profiles from public,anon,authenticated;
grant select on public.seller_profiles to anon,authenticated;
insert into public.seller_profiles(id,display_name) select id,display_name from public.profiles;

create schema if not exists termtrove_private;
revoke all on schema termtrove_private from public,anon,authenticated;
create function termtrove_private.sync_seller_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.seller_profiles(id,display_name) values(new.id,new.display_name)
 on conflict(id) do update set display_name=excluded.display_name;
 return new;
end;$$;
revoke all on function termtrove_private.sync_seller_profile() from public,anon,authenticated;
create trigger sync_marketplace_seller_name after insert or update of display_name on public.profiles
for each row execute function termtrove_private.sync_seller_profile();

create or replace view public.public_sellers with (security_invoker=true,security_barrier=true)
as select id,display_name from public.seller_profiles;
revoke all on public.public_sellers from public,anon,authenticated;
grant select on public.public_sellers to anon,authenticated;

-- Cache the request identity once per policy statement, preserving ownership.
alter policy profile_read_self on public.profiles using(id=(select auth.uid()));
alter policy profile_update_self on public.profiles using(id=(select auth.uid())) with check(id=(select auth.uid()));
alter policy listing_read on public.listings using(status<>'archived' or seller_id=(select auth.uid()));
alter policy image_read on public.images using(owner_id=(select auth.uid()) or exists(select 1 from public.listings l where l.id=listing_id and l.status<>'archived'));
alter policy image_upload on public.images with check(owner_id=(select auth.uid()) and listing_id is null);
alter policy order_participants on public.orders using(buyer_id=(select auth.uid()) or seller_id=(select auth.uid()));
alter policy conversation_read on public.order_messages using(exists(select 1 from public.orders o where o.id=order_id and (o.buyer_id=(select auth.uid()) or o.seller_id=(select auth.uid()))));
alter policy conversation_write on public.order_messages with check(sender_id=(select auth.uid()) and exists(select 1 from public.orders o where o.id=order_id and o.status='pending' and (o.buyer_id=(select auth.uid()) or o.seller_id=(select auth.uid()))));
alter policy contact_write_self on public.contact_messages with check(user_id=(select auth.uid()));

create index images_owner on public.images(owner_id);
create index order_messages_sender on public.order_messages(sender_id);
create index contact_messages_user on public.contact_messages(user_id);
