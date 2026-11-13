create table "public"."liked" (
    "user_id" uuid not null,
    "id" integer not null,
    "type" text not null,
    "adult" boolean not null default false,
    "backdrop_path" text,
    "poster_path" text,
    "release_date" date not null default CURRENT_DATE,
    "title" text not null,
    "vote_average" numeric(4,1) not null default 0,
    "created_at" timestamp with time zone not null default now()
);

alter table "public"."liked" enable row level security;

CREATE UNIQUE INDEX liked_pkey ON public.liked USING btree (user_id, id, type);

alter table "public"."liked" add constraint "liked_pkey" PRIMARY KEY using index "liked_pkey";

alter table "public"."liked" add constraint "liked_type_check" CHECK ((type = ANY (ARRAY['movie'::text, 'tv'::text]))) not valid;

alter table "public"."liked" validate constraint "liked_type_check";

alter table "public"."liked" add constraint "liked_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."liked" validate constraint "liked_user_id_fkey";

grant delete on table "public"."liked" to "anon";
grant insert on table "public"."liked" to "anon";
grant references on table "public"."liked" to "anon";
grant select on table "public"."liked" to "anon";
grant trigger on table "public"."liked" to "anon";
grant truncate on table "public"."liked" to "anon";
grant update on table "public"."liked" to "anon";

grant delete on table "public"."liked" to "authenticated";
grant insert on table "public"."liked" to "authenticated";
grant references on table "public"."liked" to "authenticated";
grant select on table "public"."liked" to "authenticated";
grant trigger on table "public"."liked" to "authenticated";
grant truncate on table "public"."liked" to "authenticated";
grant update on table "public"."liked" to "authenticated";

grant delete on table "public"."liked" to "service_role";
grant insert on table "public"."liked" to "service_role";
grant references on table "public"."liked" to "service_role";
grant select on table "public"."liked" to "service_role";
grant trigger on table "public"."liked" to "service_role";
grant truncate on table "public"."liked" to "service_role";
grant update on table "public"."liked" to "service_role";

create policy "Users can delete their own liked"
on "public"."liked"
as permissive
for delete
to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users can insert their own liked"
on "public"."liked"
as permissive
for insert
to authenticated
with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users can view their own liked"
on "public"."liked"
as permissive
for select
to authenticated
using ((( SELECT auth.uid() AS uid) = user_id));

