create table public.event_cash_registries (
  event_id uuid primary key references public.events(id) on delete cascade,
  funds jsonb not null default '[]'::jsonb,
  constraint event_cash_registries_funds check (
    case when jsonb_typeof(funds) = 'array'
      then jsonb_array_length(funds) <= 8 and octet_length(funds::text) <= 16384
      else false end
  )
);
alter table public.event_cash_registries enable row level security;
revoke all on table public.event_cash_registries from public, anon, authenticated;
grant select on table public.event_cash_registries to anon, authenticated;
grant select, insert, update on table public.event_cash_registries to service_role;
create policy "Read published registries or your own"
  on public.event_cash_registries for select to anon, authenticated
  using (exists (
    select 1 from public.events e
    where e.id = event_cash_registries.event_id
      and (e.published or e.creator_id = (select auth.uid()))
  ));
comment on table public.event_cash_registries is
  'Public fund descriptions and suggested amounts for published events. Writes use the authenticated owner-only event-guests endpoint. Stores no payments or wallet contacts.';
