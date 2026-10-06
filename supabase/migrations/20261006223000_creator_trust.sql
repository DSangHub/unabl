create schema if not exists unabl_private;
revoke all on schema unabl_private from public, anon, authenticated;

create table public.creator_verification_requests (
 creator_id uuid primary key references public.event_creators(user_id),
 requested_at timestamptz not null default now()
);
create table public.creator_verifications (
 creator_id uuid primary key references public.event_creators(user_id),
 identity_status text not null default 'pending' check(identity_status in ('pending','approved','rejected')),
 stripe_verified boolean not null default false,
 risk_blocked boolean not null default true,
 reviewed_at timestamptz,
 check(identity_status <> 'approved' or reviewed_at is not null)
);
alter table public.events add constraint events_id_creator_unique unique(id,creator_id);
create table public.gift_payments (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null,
 creator_id uuid not null,
 donor_id uuid not null references auth.users(id),
 amount_cents integer not null check(amount_cents > 0),
 currency text not null default 'usd' check(currency='usd'),
 stripe_payment_id text not null unique,
 stripe_transfer_id text unique,
 paid_at timestamptz not null,
 state text not null default 'held' check(state in ('held','released','refunded','disputed','failed')),
 foreign key(event_id,creator_id) references public.events(id,creator_id),
 unique(id,donor_id,creator_id),
 check(donor_id <> creator_id)
);
create table public.creator_vouches (
 creator_id uuid not null,
 donor_id uuid not null,
 gift_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(creator_id,donor_id),
 foreign key(gift_id,donor_id,creator_id) references public.gift_payments(id,donor_id,creator_id),
 check(donor_id <> creator_id)
);
create table public.event_fraud_reports (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id),
 reporter_id uuid not null references auth.users(id),
 reason text not null check(length(trim(reason)) between 10 and 2000),
 resolved_at timestamptz,
 created_at timestamptz not null default now()
);
create index gift_payments_creator_idx on public.gift_payments(creator_id);
create index gift_payments_donor_idx on public.gift_payments(donor_id);
create index creator_vouches_gift_idx on public.creator_vouches(gift_id);
create index event_fraud_reports_event_idx on public.event_fraud_reports(event_id) where resolved_at is null;

alter table public.creator_verification_requests enable row level security;
alter table public.creator_verifications enable row level security;
alter table public.gift_payments enable row level security;
alter table public.creator_vouches enable row level security;
alter table public.event_fraud_reports enable row level security;
revoke all on public.creator_verification_requests,public.creator_verifications,public.gift_payments,public.creator_vouches,public.event_fraud_reports from anon,authenticated;
grant select on public.creator_verification_requests,public.creator_verifications,public.gift_payments,public.creator_vouches,public.event_fraud_reports to authenticated;
grant insert(creator_id) on public.creator_verification_requests to authenticated;
grant insert(creator_id,donor_id,gift_id) on public.creator_vouches to authenticated;
grant delete on public.creator_vouches to authenticated;
grant insert(event_id,reporter_id,reason) on public.event_fraud_reports to authenticated;
grant all on public.creator_verification_requests,public.creator_verifications,public.gift_payments,public.creator_vouches,public.event_fraud_reports to service_role;
create policy requests_own_read on public.creator_verification_requests for select to authenticated using(creator_id=(select auth.uid()));
create policy requests_own_insert on public.creator_verification_requests for insert to authenticated with check(creator_id=(select auth.uid()) and exists(select 1 from public.event_creators c where c.user_id=(select auth.uid())));
create policy verification_own_read on public.creator_verifications for select to authenticated using(creator_id=(select auth.uid()));
create policy gifts_participant_read on public.gift_payments for select to authenticated using(donor_id=(select auth.uid()) or creator_id=(select auth.uid()));
create policy vouches_own_read on public.creator_vouches for select to authenticated using(donor_id=(select auth.uid()));
create policy vouches_own_delete on public.creator_vouches for delete to authenticated using(donor_id=(select auth.uid()));
create policy vouches_paid_donor_insert on public.creator_vouches for insert to authenticated with check(
 donor_id=(select auth.uid()) and creator_id <> (select auth.uid()) and exists(
 select 1 from public.gift_payments g where g.id=gift_id and g.donor_id=(select auth.uid()) and g.creator_id=creator_vouches.creator_id and g.state in ('held','released') and g.paid_at<=now()));
create policy reports_own_read on public.event_fraud_reports for select to authenticated using(reporter_id=(select auth.uid()));
create policy reports_own_insert on public.event_fraud_reports for insert to authenticated with check(reporter_id=(select auth.uid()) and exists(select 1 from public.events e where e.id=event_id and e.published));

create function unabl_private.creator_trust(target uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 with tally as (select count(*)::integer as total from public.creator_vouches v join public.gift_payments g on g.id=v.gift_id where v.creator_id=target and g.state in ('held','released') and g.paid_at<=now()),
 checks as (select coalesce((select identity_status='approved' and stripe_verified and not risk_blocked from public.creator_verifications where creator_id=target),false) as approved,
 exists(select 1 from public.event_fraud_reports r join public.events e on e.id=r.event_id where e.creator_id=target and r.resolved_at is null) as reported)
 select jsonb_build_object('vouches',tally.total,'required_vouches',3,'verified',checks.approved and not checks.reported and tally.total>=3) from tally,checks
 where target=auth.uid() or exists(select 1 from public.events e where e.creator_id=target and e.published);
$$;
revoke all on function unabl_private.creator_trust(uuid) from public;
grant usage on schema unabl_private to anon,authenticated;
grant execute on function unabl_private.creator_trust(uuid) to anon,authenticated;
create function public.get_creator_trust(target uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select unabl_private.creator_trust(target); $$;
revoke all on function public.get_creator_trust(uuid) from public;
grant execute on function public.get_creator_trust(uuid) to anon,authenticated;

create function unabl_private.gift_release_eligible(gift uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select g.state='held' and g.stripe_transfer_id is null and g.paid_at+interval '5 days'<=now()
 and v.identity_status='approved' and v.stripe_verified and not v.risk_blocked
 and not exists(select 1 from public.event_fraud_reports r join public.events e on e.id=r.event_id where e.creator_id=g.creator_id and r.resolved_at is null)
 and (select count(*) from public.creator_vouches cv join public.gift_payments vg on vg.id=cv.gift_id where cv.creator_id=g.creator_id and vg.state in ('held','released') and vg.paid_at<=now())>=3
 from public.gift_payments g join public.creator_verifications v on v.creator_id=g.creator_id where g.id=gift),false);
$$;
revoke all on function unabl_private.gift_release_eligible(uuid) from public,anon,authenticated;
grant usage on schema unabl_private to service_role;
grant execute on function unabl_private.gift_release_eligible(uuid) to service_role;
create function unabl_private.guard_gift_release() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='INSERT' and NEW.state='released' then raise exception 'New gifts must start held'; end if;
 if TG_OP='UPDATE' and NEW.state='released' and OLD.state <> 'released' then
  if not unabl_private.gift_release_eligible(OLD.id) then raise exception 'Gift release gate has not passed'; end if;
  if NEW.stripe_transfer_id is null then raise exception 'Confirmed Stripe transfer required'; end if;
 end if;
 if TG_OP='UPDATE' and (NEW.paid_at<>OLD.paid_at or NEW.creator_id<>OLD.creator_id or NEW.donor_id<>OLD.donor_id or NEW.event_id<>OLD.event_id or NEW.amount_cents<>OLD.amount_cents or NEW.stripe_payment_id<>OLD.stripe_payment_id) then raise exception 'Payment identity and hold start are immutable'; end if;
 return NEW;
end; $$;
revoke all on function unabl_private.guard_gift_release() from public,anon,authenticated;
create trigger guard_gift_release before insert or update on public.gift_payments for each row execute function unabl_private.guard_gift_release();
