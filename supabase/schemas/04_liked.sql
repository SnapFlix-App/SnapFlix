create table public.liked (
  user_id uuid not null references auth.users(id) on delete cascade,
  id integer not null,
  type text not null check (type in ('movie','tv')),
  adult boolean not null default false,
  backdrop_path text,
  poster_path text,
  release_date date not null default CURRENT_DATE,
  title text not null,
  vote_average numeric(4,1) not null default 0,
  created_at timestamp with time zone not null default now(),
  primary key (user_id, id, type)
);

alter table public.liked enable row level security;

-- Policies
create policy "Users can view their own liked"
on public.liked
for select
to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users can insert their own liked"
on public.liked
for insert
to authenticated
with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users can delete their own liked"
on public.liked
for delete
to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));

