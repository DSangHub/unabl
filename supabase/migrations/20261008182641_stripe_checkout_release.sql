create table public.creator_stripe_accounts (
 creator_id uuid primary key references public.event_creators(user_id),
 stripe_account_id text not null unique,
 transfers_active boolean not null default false,
 checked_at timestamptz
);
create table public.checkout_orders (
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,
 donor_id uuid not null references auth.users(id), event_id uuid not null,creator_id uuid not null,
 gift_cents integer not null check(gift_cents between 1000 and 100000),
 total_cents integer not null check(total_cents=gift_cents+round(gift_cents*.02)+round(gift_cents*.029)+30),
 message text not null default '' check(length(message)<=2000),
 stripe_session_id text unique,stripe_payment_id text unique,
 status text not null default 'pending' check(status in ('pending','paid','failed')),
 created_at timestamptz not null default now(),
 foreign key(event_id,creator_id) references public.events(id,creator_id),check(donor_id<>creator_id)
);
create table public.stripe_webhook_events(id text primary key,type text not null,processed_at timestamptz not null default now());
alter table public.gift_payments add column order_id uuid unique references public.checkout_orders(id),add column stripe_charge_id text unique;
create table public.gift_release_jobs (
 id uuid primary key default gen_random_uuid(),gift_id uuid not null references public.gift_payments(id),
 status text not null default 'pending' check(status in ('pending','completed','reversed')),
 stripe_transfer_id text unique,lease_until timestamptz not null default now(),created_at timestamptz not null default now()
);
create unique index one_pending_release_per_gift on public.gift_release_jobs(gift_id) where status='pending';
create index release_jobs_gift_idx on public.gift_release_jobs(gift_id);
create index checkout_orders_donor_idx on public.checkout_orders(donor_id);
create index checkout_orders_event_idx on public.checkout_orders(event_id,creator_id);
create index gifts_hold_idx on public.gift_payments(paid_at) where state='held';
alter table public.creator_stripe_accounts enable row level security;
alter table public.checkout_orders enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.gift_release_jobs enable row level security;
revoke all on public.creator_stripe_accounts,public.checkout_orders,public.stripe_webhook_events,public.gift_release_jobs from anon,authenticated;
grant all on public.creator_stripe_accounts,public.checkout_orders,public.stripe_webhook_events,public.gift_release_jobs to service_role;
grant select on public.creator_stripe_accounts,public.checkout_orders to authenticated;
create policy connected_account_own_read on public.creator_stripe_accounts for select to authenticated using(creator_id=(select auth.uid()));
create policy orders_donor_read on public.checkout_orders for select to authenticated using(donor_id=(select auth.uid()));
create function public.fulfill_gift_order(order_key uuid,session_key text,payment_key text,charge_key text,paid_time timestamptz,gift_state text) returns void language plpgsql security invoker set search_path='' as $$
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
 insert into public.gift_payments(event_id,creator_id,donor_id,amount_cents,stripe_payment_id,paid_at,state,order_id,stripe_charge_id)
 values(o.event_id,o.creator_id,o.donor_id,o.gift_cents,payment_key,paid_time,gift_state,o.id,charge_key);
 update public.checkout_orders set status='paid',stripe_session_id=session_key,stripe_payment_id=payment_key where id=o.id;
end; $$;
create function public.gift_release_eligible(gift uuid) returns boolean language sql stable security invoker set search_path='' as $$select unabl_private.gift_release_eligible(gift);$$;
create function public.claim_gift_releases() returns setof public.gift_release_jobs language plpgsql security invoker set search_path='' as $$
begin
 insert into public.gift_release_jobs(gift_id)
 select g.id from public.gift_payments g where g.stripe_charge_id is not null and unabl_private.gift_release_eligible(g.id)
 on conflict(gift_id) where status='pending' do nothing;
 return query with candidates as (
 select id from public.gift_release_jobs where status='pending' and lease_until<=now() order by created_at limit 10 for update skip locked
 ) update public.gift_release_jobs j set lease_until=now()+interval '10 minutes' from candidates c where j.id=c.id returning j.*;
end;$$;
create function public.finalize_gift_release(job_key uuid,transfer_key text) returns void language plpgsql security invoker set search_path='' as $$
declare j public.gift_release_jobs;
begin
 select * into j from public.gift_release_jobs where id=job_key for update;
 if not found then raise exception 'Job missing';end if;
 if j.status='completed' and j.stripe_transfer_id=transfer_key then return;end if;
 if j.status<>'pending' or j.stripe_transfer_id<>transfer_key then raise exception 'Transfer mismatch';end if;
 update public.gift_payments set state='released',stripe_transfer_id=transfer_key where id=j.gift_id and state='held';
 if not found then raise exception 'Gift is blocked';end if;
 update public.gift_release_jobs set status='completed' where id=j.id;
end;$$;
revoke all on function public.fulfill_gift_order(uuid,text,text,text,timestamptz,text),public.gift_release_eligible(uuid),public.claim_gift_releases(),public.finalize_gift_release(uuid,text) from public,anon,authenticated;
grant execute on function public.fulfill_gift_order(uuid,text,text,text,timestamptz,text),public.gift_release_eligible(uuid),public.claim_gift_releases(),public.finalize_gift_release(uuid,text) to service_role;
