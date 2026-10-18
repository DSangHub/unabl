create table public.event_albums (
 id uuid primary key default gen_random_uuid(), event_id uuid not null unique references public.events(id) on delete cascade,
 tier text not null check(tier in ('classic','gold')), title text not null check(length(title) between 1 and 100),
 subtitle text not null default '' check(length(subtitle)<=160), dedication text not null default '' check(length(dedication)<=600),
 guest_view boolean not null default false, created_at timestamptz not null default now()
);
create table public.album_orders (
 id uuid primary key, album_id uuid not null references public.event_albums(id) on delete cascade,
 host_id uuid not null references auth.users(id), tier text not null check(tier in ('classic','gold')),
 amount_cents integer not null check((tier='classic' and amount_cents=795) or (tier='gold' and amount_cents=1495)),
 status text not null default 'pending' check(status in ('pending','paid','failed','refunded','disputed')),
 livemode boolean not null, stripe_platform_id text not null, stripe_session_id text unique, payment_intent_id text unique, charge_id text unique,
 created_at timestamptz not null default now()
);
create unique index album_one_open_purchase on public.album_orders(album_id) where status in ('pending','paid');
create index album_orders_album on public.album_orders(album_id);
create table public.album_videos (
 id uuid primary key, album_id uuid not null references public.event_albums(id) on delete cascade,
 user_id uuid not null references auth.users(id), sender_name text not null check(length(sender_name) between 1 and 60),
 message text not null default '' check(length(message)<=600), object_path text not null unique,
 status text not null default 'pending' check(status in ('pending','ready','removed')),
 approved boolean not null default false, created_at timestamptz not null default now()
);
create index album_videos_album on public.album_videos(album_id,created_at);
alter table public.event_albums enable row level security;
alter table public.album_orders enable row level security;
alter table public.album_videos enable row level security;
revoke all on public.event_albums,public.album_orders,public.album_videos from anon,authenticated;
grant all on public.event_albums,public.album_orders,public.album_videos to service_role;
-- Private bucket: no public or authenticated object policies. Server signs scoped paths after authorization.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('event-greetings','event-greetings',false,26214400,array['video/mp4','video/webm','video/quicktime']) on conflict(id) do nothing;
create function public.reserve_album_video(album_key uuid, video_key uuid, sender_key uuid, sender_label text, greeting text, file_path text)
returns void language plpgsql security invoker set search_path=public as $$
begin
 perform 1 from public.event_albums where id=album_key for update;
 if not found then raise exception 'Album not found'; end if;
 if (select count(*) from public.album_videos where album_id=album_key)>=100 then raise exception 'Album upload retry limit reached'; end if;
 if (select count(*) from public.album_videos where album_id=album_key and user_id=sender_key)>=10 then raise exception 'Guest upload retry limit reached'; end if;
 if (select count(*) from public.album_videos where album_id=album_key and status<>'removed')>=20 then raise exception 'Album is full (20 videos)'; end if;
 if (select count(*) from public.album_videos where album_id=album_key and user_id=sender_key and status<>'removed')>=2 then raise exception 'Each guest can upload two videos'; end if;
 insert into public.album_videos(id,album_id,user_id,sender_name,message,object_path) values(video_key,album_key,sender_key,sender_label,greeting,file_path);
end; $$;
revoke all on function public.reserve_album_video(uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_album_video(uuid,uuid,uuid,text,text,text) to service_role;
