-- Brings a database to the state of 20261001220000_one_profile_per_email
-- whether or not that migration ran. Production was missing
-- public.submit_candidate_profile entirely, so 20261001220000 could not run
-- there (its unconditional drop function fails). Every statement here is safe
-- to run on a database that already has 20261001220000 applied.

-- ---------------------------------------------------------------------------
-- CV replacement tracking
-- ---------------------------------------------------------------------------

alter table public.candidates add column if not exists cv_updated_at timestamptz;

comment on column public.candidates.cv_updated_at is 'When the candidate last replaced their CV. Null if never replaced.';

create table if not exists public.candidate_cv_history (
  id bigint generated always as identity primary key,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  cv_path text not null,
  replaced_at timestamptz not null default now()
);

create index if not exists candidate_cv_history_candidate_id_idx on public.candidate_cv_history (candidate_id);

comment on table public.candidate_cv_history is 'CVs a candidate has replaced. Paths point into the private "cvs" bucket.';

alter table public.candidate_cv_history enable row level security;

drop policy if exists "Admins can read CV history" on public.candidate_cv_history;

create policy "Admins can read CV history"
on public.candidate_cv_history
for select
to authenticated
using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- Submission
-- ---------------------------------------------------------------------------

drop function if exists public.submit_candidate_profile(
  text, text, text, integer, text, numeric, text, text, text, text, text, text, text[], text, text, boolean, text
);
drop function if exists private.submit_candidate_profile(
  text, text, text, integer, text, numeric, text, text, text, text, text, text, text[], text, text, boolean, text
);

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
  p_user_agent text,
  p_replace_cv boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate_id uuid;
  v_previous_cv text;
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

  if p_desired_salary_amount is null
    or nullif(btrim(p_desired_salary_currency), '') is null
    or p_desired_salary_period is null then
    raise exception 'salary_required' using errcode = '22023';
  end if;

  if p_desired_salary_period not in ('year', 'month') then
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

  select id, cv_path
  into v_candidate_id, v_previous_cv
  from public.candidates
  where lower(email) = v_email
  for update;

  if v_candidate_id is not null then
    if p_replace_cv is not true then
      raise exception 'already_submitted' using errcode = '23505';
    end if;

    if v_previous_cv <> p_cv_path then
      insert into public.candidate_cv_history (candidate_id, cv_path)
      values (v_candidate_id, v_previous_cv);

      update public.candidates
      set cv_path = p_cv_path, cv_updated_at = now()
      where id = v_candidate_id;
    end if;

    insert into public.candidate_consents (candidate_id, consent_version, user_agent)
    values (v_candidate_id, p_consent_version, left(p_user_agent, 500));

    return v_candidate_id;
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
      upper(btrim(p_desired_salary_currency)),
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
        raise exception 'already_submitted' using errcode = '23505';
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
  p_user_agent text,
  p_replace_cv boolean default false
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
    p_user_agent,
    p_replace_cv
  );
$$;

revoke all on function private.submit_candidate_profile(
  text, text, text, integer, text, numeric, text, text, text, text, text, text, text[], text, text, boolean, text, boolean
) from public, anon, authenticated;
revoke all on function public.submit_candidate_profile(
  text, text, text, integer, text, numeric, text, text, text, text, text, text, text[], text, text, boolean, text, boolean
) from public, anon, authenticated;

grant execute on function private.submit_candidate_profile(
  text, text, text, integer, text, numeric, text, text, text, text, text, text, text[], text, text, boolean, text, boolean
) to anon, authenticated;
grant execute on function public.submit_candidate_profile(
  text, text, text, integer, text, numeric, text, text, text, text, text, text, text[], text, text, boolean, text, boolean
) to anon, authenticated;
