-- Run once in Supabase SQL Editor after the existing schema.sql.
-- Durable, transactionally marked outbox. No public SELECT/EXECUTE permissions.
create table if not exists public.studio_sync (
  id integer primary key check (id = 1),
  version bigint not null default 1,
  synced_version bigint not null default 0,
  lease_token uuid,
  lease_until timestamptz,
  last_synced_at timestamptz,
  commit_url text,
  last_error text
);
insert into public.studio_sync(id) values (1) on conflict do nothing;
alter table public.studio_sync enable row level security;
revoke all on public.studio_sync from anon, authenticated;
grant all on public.studio_sync to service_role;

create or replace function public.mark_studio_sync()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.studio_sync set version = version + 1, last_error = null where id = 1;
  return null;
end;
$$;
revoke all on function public.mark_studio_sync() from public, anon, authenticated;

drop trigger if exists studio_news_changed on public.news;
create trigger studio_news_changed after insert or update or delete on public.news
for each statement execute function public.mark_studio_sync();
drop trigger if exists studio_portfolio_changed on public.portfolio_items;
create trigger studio_portfolio_changed after insert or update or delete on public.portfolio_items
for each statement execute function public.mark_studio_sync();

-- Row lock serializes workers across serverless instances. Snapshot and version
-- are captured in one transaction; changes after capture remain pending.
create or replace function public.claim_studio_sync(worker uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare s public.studio_sync; news_data jsonb; work_data jsonb;
begin
  select * into s from public.studio_sync where id = 1 for update;
  if s.lease_until > now() then return null; end if;
  update public.studio_sync set lease_token = worker, lease_until = now() + interval '120 seconds' where id = 1;
  select coalesce(jsonb_agg(to_jsonb(n) order by n.id), '[]'::jsonb) into news_data from (
    select id, title, slug, excerpt, content, cover_image, category, tags, published_at, updated_at
    from public.news where status = 'published' and published_at <= now()
  ) n;
  select coalesce(jsonb_agg(to_jsonb(p) order by p.kind, p.position, p.id), '[]'::jsonb) into work_data from (
    select id, kind, title, title_id, subtitle, description, description_id, tag, tag_id,
      year, platform, image, image_alt, link, extra_links, position, is_published, is_featured
    from public.portfolio_items where is_published = true
  ) p;
  return jsonb_build_object('version', s.version, 'snapshot', jsonb_build_object(
    'schemaVersion', 1, 'news', news_data, 'portfolio', work_data
  ));
end;
$$;
revoke all on function public.claim_studio_sync(uuid) from public, anon, authenticated;
grant execute on function public.claim_studio_sync(uuid) to service_role;

create or replace function public.finish_studio_sync(worker uuid, captured_version bigint, result_url text, error_message text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.studio_sync set
    lease_token = null,
    lease_until = null,
    synced_version = case when error_message is null then greatest(synced_version, captured_version) else synced_version end,
    last_synced_at = case when error_message is null then now() else last_synced_at end,
    commit_url = coalesce(result_url, commit_url),
    last_error = error_message
  where id = 1 and lease_token = worker;
end;
$$;
revoke all on function public.finish_studio_sync(uuid, bigint, text, text) from public, anon, authenticated;
grant execute on function public.finish_studio_sync(uuid, bigint, text, text) to service_role;
