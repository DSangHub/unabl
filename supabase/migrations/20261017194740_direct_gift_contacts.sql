create table public.event_direct_contacts (
 event_id uuid primary key references public.events(id) on delete cascade,
 apple_cash text not null default '' check(length(apple_cash)<=254),
 samsung_wallet text not null default '' check(length(samsung_wallet)<=25)
);
alter table public.event_direct_contacts enable row level security;
revoke all on public.event_direct_contacts from anon,authenticated;
grant all on public.event_direct_contacts to service_role;
comment on table public.event_direct_contacts is 'Host-opted-in wallet contacts. Server-only: disclose only after invited confirmed email and current gift code checks. Never store card/bank numbers.';
