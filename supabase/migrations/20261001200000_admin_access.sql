-- Back office (/ntokozo): platform admins sign in with Supabase Auth and can
-- read every candidate, open CVs and change a candidate's status.
-- Being signed in is not enough: the user must also be listed in
-- private.admin_users. Everyone else still cannot read anything.

-- ---------------------------------------------------------------------------
-- Admin allow-list
-- ---------------------------------------------------------------------------

create table private.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table private.admin_users is 'Auth users allowed into the /ntokozo back office.';

alter table private.admin_users enable row level security;
revoke all on table private.admin_users from public, anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.admin_users where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_admin();
$$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security for admins
-- ---------------------------------------------------------------------------

create policy "Admins can read candidates"
on public.candidates
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can update candidates"
on public.candidates
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- Admins only change the pipeline status; the submitted profile stays as the
-- candidate wrote it.
revoke update on table public.candidates from anon, authenticated;
grant update (status) on table public.candidates to authenticated;

create policy "Admins can read skills"
on public.skills
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can read candidate skills"
on public.candidate_skills
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can read consent documents"
on public.consent_documents
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can read candidate consents"
on public.candidate_consents
for select
to authenticated
using ((select private.is_admin()));

create policy "Admins can read candidate status history"
on public.candidate_status_history
for select
to authenticated
using ((select private.is_admin()));

-- Needed to create signed URLs for CVs in the private bucket.
create policy "Admins can read CVs"
on storage.objects
for select
to authenticated
using (bucket_id = 'cvs' and (select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Candidate search
-- Every word in p_search must match the name, email, location, desired role
-- or one of the candidate's skills. Runs as the caller, so RLS returns no
-- rows to anyone who is not an admin.
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_candidates(
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  full_name text,
  email text,
  location text,
  desired_role text,
  years_experience smallint,
  work_preference public.work_preference,
  status public.candidate_status,
  submitted_at timestamptz,
  skills text[],
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with terms as (
    select distinct
      '%' || replace(replace(replace(t.term, '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
    from regexp_split_to_table(btrim(coalesce(p_search, '')), '\s+') as t(term)
    where t.term <> ''
  ),
  candidate_rows as (
    select
      c.id,
      c.full_name,
      c.email,
      c.location,
      c.desired_role,
      c.years_experience,
      c.work_preference,
      c.status,
      c.submitted_at,
      coalesce(
        (
          select array_agg(s.name order by lower(s.name))
          from public.candidate_skills cs
          join public.skills s on s.id = cs.skill_id
          where cs.candidate_id = c.id
        ),
        '{}'
      ) as skill_names
    from public.candidates c
  )
  select
    r.id,
    r.full_name,
    r.email,
    r.location,
    r.desired_role,
    r.years_experience,
    r.work_preference,
    r.status,
    r.submitted_at,
    r.skill_names,
    count(*) over () as total_count
  from candidate_rows r
  where not exists (
    select 1
    from terms
    where not (
      r.full_name ilike terms.pattern
      or r.email ilike terms.pattern
      or r.location ilike terms.pattern
      or r.desired_role ilike terms.pattern
      or exists (
        select 1 from unnest(r.skill_names) as sk(name) where sk.name ilike terms.pattern
      )
    )
  )
  order by r.submitted_at desc, r.id
  limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.admin_list_candidates(text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_list_candidates(text, integer, integer) to authenticated;
