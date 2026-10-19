alter table public.event_direct_contacts add column cash_app text not null default '' check (cash_app = '' or (cash_app ~ '^[A-Za-z0-9]{1,20}$' and cash_app ~ '[A-Za-z]'));
comment on column public.event_direct_contacts.cash_app is 'Host opted-in Cashtag without dollar prefix. Server-only disclosure to confirmed invited guests with current code. Not payment verification.';
