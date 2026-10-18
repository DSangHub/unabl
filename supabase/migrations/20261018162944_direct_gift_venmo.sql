alter table public.event_direct_contacts add column venmo text not null default '' check (venmo = '' or venmo ~ '^[A-Za-z0-9_-]{5,30}$');
comment on column public.event_direct_contacts.venmo is 'Host opted-in Venmo username, disclosed only to invited confirmed guests with current gift code. Not a payment verification.';
