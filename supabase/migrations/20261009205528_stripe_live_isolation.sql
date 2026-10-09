-- Preserve existing sandbox history and require a separate live recipient account.
alter table public.creator_stripe_accounts add column livemode boolean not null default false, add column stripe_platform_id text not null default 'acct_1UNd1XAoNpiHrPTx';
alter table public.creator_stripe_accounts drop constraint creator_stripe_accounts_pkey;
alter table public.creator_stripe_accounts add primary key(creator_id,stripe_platform_id);
alter table public.checkout_orders add column livemode boolean not null default false, add column stripe_platform_id text not null default 'acct_1UNd1XAoNpiHrPTx';
alter table public.gift_payments add column livemode boolean not null default false, add column stripe_platform_id text not null default 'acct_1UNd1XAoNpiHrPTx';
update public.creator_verifications set stripe_verified=false where stripe_verified;
create or replace function public.fulfill_gift_order(order_key uuid,session_key text,payment_key text,charge_key text,paid_time timestamptz,gift_state text) returns void language plpgsql security invoker set search_path='' as $$
declare o public.checkout_orders;
begin
 select * into o from public.checkout_orders where id=order_key for update;
 if not found then raise exception 'Order missing';end if;
 if o.stripe_session_id is not null and o.stripe_session_id<>session_key then raise exception 'Session mismatch';end if;
 if o.status='paid' then
  if o.stripe_payment_id<>payment_key then raise exception 'Payment mismatch';end if;
  return;
 end if;
 if gift_state not in ('held','refunded','disputed') or paid_time>now()+interval '5 minutes' then raise exception 'Invalid payment state';end if;
 insert into public.gift_payments(event_id,creator_id,donor_id,amount_cents,stripe_payment_id,paid_at,state,order_id,stripe_charge_id,livemode,stripe_platform_id)
 values(o.event_id,o.creator_id,o.donor_id,o.gift_cents,payment_key,paid_time,gift_state,o.id,charge_key,o.livemode,o.stripe_platform_id);
 update public.checkout_orders set status='paid',stripe_session_id=session_key,stripe_payment_id=payment_key where id=o.id;
end; $$;
create or replace function unabl_private.creator_trust(target uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 with tally as (select count(*)::integer as total from public.creator_vouches v join public.gift_payments g on g.id=v.gift_id where v.creator_id=target and g.livemode and g.state in ('held','released') and g.paid_at<=now()),
 checks as (select coalesce((select identity_status='approved' and stripe_verified and not risk_blocked from public.creator_verifications where creator_id=target),false) as approved,
 exists(select 1 from public.event_fraud_reports r join public.events e on e.id=r.event_id where e.creator_id=target and r.resolved_at is null) as reported)
 select jsonb_build_object('vouches',tally.total,'required_vouches',3,'verified',checks.approved and not checks.reported and tally.total>=3) from tally,checks
 where target=auth.uid() or exists(select 1 from public.events e where e.creator_id=target and e.published);
$$;
create or replace function unabl_private.gift_release_eligible(gift uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select g.livemode and g.state='held' and g.stripe_transfer_id is null and g.paid_at+interval '5 days'<=now()
 and v.identity_status='approved' and v.stripe_verified and not v.risk_blocked
 and not exists(select 1 from public.event_fraud_reports r join public.events e on e.id=r.event_id where e.creator_id=g.creator_id and r.resolved_at is null)
 and (select count(*) from public.creator_vouches cv join public.gift_payments vg on vg.id=cv.gift_id where cv.creator_id=g.creator_id and vg.livemode=g.livemode and vg.stripe_platform_id=g.stripe_platform_id and vg.state in ('held','released') and vg.paid_at<=now())>=3
 from public.gift_payments g join public.creator_verifications v on v.creator_id=g.creator_id where g.id=gift),false);
$$;
drop function public.claim_gift_releases();
create function public.claim_gift_releases(platform_key text,live_mode boolean) returns setof public.gift_release_jobs language plpgsql security invoker set search_path='' as $$
begin
 insert into public.gift_release_jobs(gift_id)
 select g.id from public.gift_payments g where g.stripe_platform_id=platform_key and g.livemode=live_mode and g.stripe_charge_id is not null and unabl_private.gift_release_eligible(g.id)
 on conflict(gift_id) where status='pending' do nothing;
 return query with candidates as (
 select j.id from public.gift_release_jobs j join public.gift_payments g on g.id=j.gift_id where j.status='pending' and j.lease_until<=now() and g.stripe_platform_id=platform_key and g.livemode=live_mode order by j.created_at limit 10 for update of j skip locked
 ) update public.gift_release_jobs j set lease_until=now()+interval '10 minutes' from candidates c where j.id=c.id returning j.*;
end;$$;
revoke all on function public.claim_gift_releases(text,boolean) from public,anon,authenticated;
grant execute on function public.claim_gift_releases(text,boolean) to service_role;
create or replace function unabl_private.guard_gift_release() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if TG_OP='INSERT' and NEW.state='released' then raise exception 'New gifts must start held'; end if;
 if TG_OP='UPDATE' and NEW.state='released' and OLD.state <> 'released' then
  if not unabl_private.gift_release_eligible(OLD.id) then raise exception 'Gift release gate has not passed'; end if;
  if NEW.stripe_transfer_id is null then raise exception 'Confirmed Stripe transfer required'; end if;
 end if;
 if TG_OP='UPDATE' and (NEW.livemode<>OLD.livemode or NEW.stripe_platform_id<>OLD.stripe_platform_id or NEW.paid_at<>OLD.paid_at or NEW.creator_id<>OLD.creator_id or NEW.donor_id<>OLD.donor_id or NEW.event_id<>OLD.event_id or NEW.amount_cents<>OLD.amount_cents or NEW.stripe_payment_id<>OLD.stripe_payment_id) then raise exception 'Payment identity and hold start are immutable'; end if;
 return NEW;
end; $$;
