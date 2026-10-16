create table public.event_guests (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 email text not null check (email = lower(btrim(email)) and length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 created_at timestamptz not null default now(),
 unique (event_id,email)
);
alter table public.event_guests enable row level security;
revoke all on public.event_guests from anon, authenticated;
grant select, insert, delete on public.event_guests to authenticated;
grant all on public.event_guests to service_role;
create policy "Hosts read their own guest lists" on public.event_guests for select to authenticated
 using (exists (select 1 from public.events e where e.id = event_id and e.creator_id = (select auth.uid())));
create policy "Hosts add their own guests" on public.event_guests for insert to authenticated
 with check (exists (select 1 from public.events e where e.id = event_id and e.creator_id = (select auth.uid())));
create policy "Hosts remove their own guests" on public.event_guests for delete to authenticated
 using (exists (select 1 from public.events e where e.id = event_id and e.creator_id = (select auth.uid())));

-- Codes are random 96-bit secrets. Only their hashes are stored; never expose hashes via the Data API.
create table public.event_gift_access (
 event_id uuid primary key references public.events(id) on delete cascade,
 code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now()
);
alter table public.event_gift_access enable row level security;
revoke all on public.event_gift_access from anon, authenticated;
grant all on public.event_gift_access to service_role;
