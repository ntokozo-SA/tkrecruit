-- Talent pool: candidate submissions, skills, consent and CV storage.
-- Anonymous visitors can only upload a CV into storage and call
-- public.submit_candidate_profile(). They cannot read any table.

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.work_preference as enum (
  'remote',
  'hybrid',
  'onsite',
  'remote_hybrid',
  'open_to_all'
);

create type public.salary_period as enum ('year', 'month');

create type public.candidate_status as enum (
  'submitted',
  'in_review',
  'active',
  'on_hold',
  'placed',
  'archived'
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Returns null for blank input, otherwise the trimmed URL. Raises if the value
-- is not an http(s) URL.
create or replace function private.clean_url(p_value text, p_field text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_value text := nullif(btrim(p_value), '');
begin
  if v_value is null then
    return null;
  end if;

  if char_length(v_value) > 300 or v_value !~* '^https?://[^\s/$.?#][^\s]*$' then
    raise exception 'invalid_url:%', p_field using errcode = '22023';
  end if;

  return v_value;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null
    check (char_length(full_name) between 2 and 120),
  email text not null
    check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  location text not null
    check (char_length(location) between 2 and 120),
  years_experience smallint not null
    check (years_experience between 0 and 50),
  desired_role text not null
    check (char_length(desired_role) between 2 and 120),
  desired_salary_amount numeric(12, 2)
    check (desired_salary_amount is null or desired_salary_amount > 0),
  desired_salary_currency char(3)
    check (desired_salary_currency is null or desired_salary_currency ~ '^[A-Z]{3}$'),
  desired_salary_period public.salary_period,
  work_preference public.work_preference not null,
  github_url text,
  portfolio_url text,
  linkedin_url text,
  cv_path text not null unique,
  status public.candidate_status not null default 'submitted',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidates_salary_complete check (
    (desired_salary_amount is null) = (desired_salary_currency is null)
    and (desired_salary_amount is null) = (desired_salary_period is null)
  )
);

create unique index candidates_email_key on public.candidates (lower(email));
create index candidates_status_idx on public.candidates (status);
create index candidates_work_preference_idx on public.candidates (work_preference);
create index candidates_years_experience_idx on public.candidates (years_experience);
create index candidates_submitted_at_idx on public.candidates (submitted_at desc);

create trigger candidates_set_updated_at
before update on public.candidates
for each row execute function private.set_updated_at();

comment on table public.candidates is 'Developers who submitted a profile to the talent pool.';
comment on column public.candidates.cv_path is 'Object path inside the private "cvs" storage bucket.';

create table public.skills (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 60),
  normalized_name text not null unique,
  created_at timestamptz not null default now()
);

comment on table public.skills is 'Shared skill vocabulary used by candidates and, later, opportunities.';

create table public.candidate_skills (
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  skill_id bigint not null references public.skills (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (candidate_id, skill_id)
);

create index candidate_skills_skill_id_idx on public.candidate_skills (skill_id);

-- Every consent wording is versioned so we can prove what a candidate agreed to.
create table public.consent_documents (
  version text primary key,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.consent_documents (version, body) values (
  'talent-pool-v1',
  'I agree to have my profile considered for relevant technology opportunities and understand that my information may be shared with recruiters, recruitment agencies, and companies for recruitment purposes.'
);

create table public.candidate_consents (
  id bigint generated always as identity primary key,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  consent_version text not null references public.consent_documents (version),
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  user_agent text check (user_agent is null or char_length(user_agent) <= 500)
);

create index candidate_consents_candidate_id_idx on public.candidate_consents (candidate_id);
create index candidate_consents_consent_version_idx on public.candidate_consents (consent_version);

-- ---------------------------------------------------------------------------
-- Row level security
-- No policies for anon/authenticated yet: all reads are blocked, and writes go
-- through the submit function below. Recruiter policies come with accounts.
-- ---------------------------------------------------------------------------

alter table public.candidates enable row level security;
alter table public.skills enable row level security;
alter table public.candidate_skills enable row level security;
alter table public.consent_documents enable row level security;
alter table public.candidate_consents enable row level security;

-- ---------------------------------------------------------------------------
-- CV storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cvs',
  'cvs',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

-- Upload only. No select/update/delete, so visitors cannot list, read or
-- overwrite any CV, including their own.
create policy "Visitors can upload a CV for submission"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'cvs'
  and (storage.foldername(name))[1] = 'submissions'
  and lower(storage.extension(name)) in ('pdf', 'doc', 'docx')
);

-- ---------------------------------------------------------------------------
-- Submission
-- ---------------------------------------------------------------------------

create or replace function private.submit_candidate_profile(
  p_full_name text,
  p_email text,
  p_location text,
  p_years_experience integer,
  p_desired_role text,
  p_desired_salary_amount numeric,
  p_desired_salary_currency text,
  p_desired_salary_period text,
  p_work_preference text,
  p_github_url text,
  p_portfolio_url text,
  p_linkedin_url text,
  p_skills text[],
  p_cv_path text,
  p_consent_version text,
  p_consent_given boolean,
  p_user_agent text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate_id uuid;
  v_skills text[];
  v_skill text;
  v_skill_id bigint;
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_constraint text;
begin
  if p_consent_given is not true then
    raise exception 'consent_required' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.consent_documents
    where version = p_consent_version and is_active
  ) then
    raise exception 'invalid_consent_version' using errcode = '22023';
  end if;

  if p_work_preference is null
    or p_work_preference not in ('remote', 'hybrid', 'onsite', 'remote_hybrid', 'open_to_all') then
    raise exception 'invalid_work_preference' using errcode = '22023';
  end if;

  if p_desired_salary_period is not null and p_desired_salary_period not in ('year', 'month') then
    raise exception 'invalid_salary_period' using errcode = '22023';
  end if;

  -- Trim, drop blanks and case-insensitive duplicates, keep first spelling.
  select coalesce(array_agg(skill order by first_pos), '{}')
  into v_skills
  from (
    select (array_agg(btrim(s) order by pos))[1] as skill, min(pos) as first_pos
    from unnest(coalesce(p_skills, '{}')) with ordinality as t(s, pos)
    where btrim(s) <> ''
    group by lower(regexp_replace(btrim(s), '\s+', ' ', 'g'))
  ) deduped;

  if cardinality(v_skills) = 0 then
    raise exception 'skills_required' using errcode = '22023';
  end if;

  if cardinality(v_skills) > 30 then
    raise exception 'too_many_skills' using errcode = '22023';
  end if;

  if p_cv_path is null
    or p_cv_path !~ '^submissions/[0-9a-f-]{36}\.(pdf|doc|docx)$'
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'cvs' and name = p_cv_path
    ) then
    raise exception 'cv_not_found' using errcode = '22023';
  end if;

  begin
    insert into public.candidates (
      full_name,
      email,
      location,
      years_experience,
      desired_role,
      desired_salary_amount,
      desired_salary_currency,
      desired_salary_period,
      work_preference,
      github_url,
      portfolio_url,
      linkedin_url,
      cv_path
    ) values (
      btrim(p_full_name),
      v_email,
      btrim(p_location),
      p_years_experience,
      btrim(p_desired_role),
      p_desired_salary_amount,
      upper(nullif(btrim(p_desired_salary_currency), '')),
      p_desired_salary_period::public.salary_period,
      p_work_preference::public.work_preference,
      private.clean_url(p_github_url, 'github'),
      private.clean_url(p_portfolio_url, 'portfolio'),
      private.clean_url(p_linkedin_url, 'linkedin'),
      p_cv_path
    )
    returning id into v_candidate_id;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'candidates_email_key' then
        -- Do not reveal whether an email is already in the pool: someone's
        -- job search is private. The original profile is kept unchanged.
        return null;
      end if;
      raise;
    when check_violation then
      get stacked diagnostics v_constraint = constraint_name;
      raise exception 'invalid_field:%', v_constraint using errcode = '22023';
    when not_null_violation then
      raise exception 'missing_required_field' using errcode = '22023';
  end;

  foreach v_skill in array v_skills loop
    if char_length(v_skill) > 60 then
      raise exception 'invalid_skill' using errcode = '22023';
    end if;

    insert into public.skills (name, normalized_name)
    values (v_skill, lower(regexp_replace(v_skill, '\s+', ' ', 'g')))
    on conflict (normalized_name) do update set normalized_name = excluded.normalized_name
    returning id into v_skill_id;

    insert into public.candidate_skills (candidate_id, skill_id)
    values (v_candidate_id, v_skill_id)
    on conflict do nothing;
  end loop;

  insert into public.candidate_consents (candidate_id, consent_version, user_agent)
  values (v_candidate_id, p_consent_version, left(p_user_agent, 500));

  return v_candidate_id;
end;
$$;

-- Thin invoker wrapper so the security definer function stays out of the
-- exposed schema. This is the only entry point the frontend calls.
create or replace function public.submit_candidate_profile(
  p_full_name text,
  p_email text,
  p_location text,
  p_years_experience integer,
  p_desired_role text,
  p_desired_salary_amount numeric,
  p_desired_salary_currency text,
  p_desired_salary_period text,
  p_work_preference text,
  p_github_url text,
  p_portfolio_url text,
  p_linkedin_url text,
  p_skills text[],
  p_cv_path text,
  p_consent_version text,
  p_consent_given boolean,
  p_user_agent text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.submit_candidate_profile(
    p_full_name,
    p_email,
    p_location,
    p_years_experience,
    p_desired_role,
    p_desired_salary_amount,
    p_desired_salary_currency,
    p_desired_salary_period,
    p_work_preference,
    p_github_url,
    p_portfolio_url,
    p_linkedin_url,
    p_skills,
    p_cv_path,
    p_consent_version,
    p_consent_given,
    p_user_agent
  );
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.clean_url(text, text) from public, anon, authenticated;
revoke all on function private.submit_candidate_profile(
  text, text, text, integer, text, numeric, text, text, text, text, text, text, text[], text, text, boolean, text
) from public, anon, authenticated;
revoke all on function public.submit_candidate_profile(
  text, text, text, integer, text, numeric, text, text, text, text, text, text, text[], text, text, boolean, text
) from public, anon, authenticated;

grant usage on schema private to anon, authenticated;
grant execute on function private.submit_candidate_profile(
  text, text, text, integer, text, numeric, text, text, text, text, text, text, text[], text, text, boolean, text
) to anon, authenticated;
grant execute on function public.submit_candidate_profile(
  text, text, text, integer, text, numeric, text, text, text, text, text, text, text[], text, text, boolean, text
) to anon, authenticated;
