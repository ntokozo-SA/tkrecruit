-- Recruiting foundation: organisations, recruiter membership, opportunities,
-- candidate pipeline, notes, contact history and status history.
-- Not used by the MVP frontend. RLS is enabled with no policies, so these
-- tables are closed until recruiter/company accounts are built.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public.organization_type as enum ('recruitment_agency', 'company');

create type public.organization_role as enum ('owner', 'admin', 'recruiter');

create type public.opportunity_status as enum ('draft', 'open', 'paused', 'filled', 'closed');

create type public.pipeline_stage as enum (
  'suggested',
  'shortlisted',
  'contacted',
  'introduced',
  'interviewing',
  'offered',
  'hired',
  'rejected',
  'withdrawn'
);

create type public.contact_channel as enum (
  'email',
  'phone',
  'linkedin',
  'video_call',
  'in_person',
  'other'
);

-- ---------------------------------------------------------------------------
-- Organisations and recruiter accounts
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  type public.organization_type not null,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function private.set_updated_at();

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.organization_role not null default 'recruiter',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members (user_id);

-- ---------------------------------------------------------------------------
-- Opportunities
-- ---------------------------------------------------------------------------

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 2 and 160),
  description text,
  location text,
  work_preference public.work_preference,
  years_experience_min smallint check (years_experience_min between 0 and 50),
  salary_min numeric(12, 2) check (salary_min is null or salary_min > 0),
  salary_max numeric(12, 2) check (salary_max is null or salary_max > 0),
  salary_currency char(3) check (salary_currency is null or salary_currency ~ '^[A-Z]{3}$'),
  salary_period public.salary_period,
  status public.opportunity_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_salary_range check (
    salary_min is null or salary_max is null or salary_min <= salary_max
  )
);

create index opportunities_organization_id_idx on public.opportunities (organization_id);
create index opportunities_created_by_idx on public.opportunities (created_by);
create index opportunities_status_idx on public.opportunities (status);

create trigger opportunities_set_updated_at
before update on public.opportunities
for each row execute function private.set_updated_at();

create table public.opportunity_skills (
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  skill_id bigint not null references public.skills (id) on delete restrict,
  is_required boolean not null default true,
  primary key (opportunity_id, skill_id)
);

create index opportunity_skills_skill_id_idx on public.opportunity_skills (skill_id);

-- ---------------------------------------------------------------------------
-- Candidate pipeline: one candidate can be linked to many opportunities
-- ---------------------------------------------------------------------------

create table public.candidate_opportunities (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  stage public.pipeline_stage not null default 'suggested',
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_id, opportunity_id)
);

create index candidate_opportunities_opportunity_id_idx on public.candidate_opportunities (opportunity_id);
create index candidate_opportunities_added_by_idx on public.candidate_opportunities (added_by);
create index candidate_opportunities_stage_idx on public.candidate_opportunities (stage);

create trigger candidate_opportunities_set_updated_at
before update on public.candidate_opportunities
for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Recruiter notes and contact history
-- ---------------------------------------------------------------------------

create table public.candidate_notes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index candidate_notes_candidate_id_idx on public.candidate_notes (candidate_id);
create index candidate_notes_organization_id_idx on public.candidate_notes (organization_id);
create index candidate_notes_author_id_idx on public.candidate_notes (author_id);

create trigger candidate_notes_set_updated_at
before update on public.candidate_notes
for each row execute function private.set_updated_at();

create table public.candidate_contacts (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  opportunity_id uuid references public.opportunities (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  contacted_by uuid references auth.users (id) on delete set null,
  channel public.contact_channel not null,
  summary text check (summary is null or char_length(summary) <= 5000),
  contacted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index candidate_contacts_candidate_id_idx on public.candidate_contacts (candidate_id);
create index candidate_contacts_opportunity_id_idx on public.candidate_contacts (opportunity_id);
create index candidate_contacts_organization_id_idx on public.candidate_contacts (organization_id);
create index candidate_contacts_contacted_by_idx on public.candidate_contacts (contacted_by);

-- ---------------------------------------------------------------------------
-- Candidate status history
-- ---------------------------------------------------------------------------

create table public.candidate_status_history (
  id bigint generated always as identity primary key,
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  from_status public.candidate_status,
  to_status public.candidate_status not null,
  changed_by uuid references auth.users (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index candidate_status_history_candidate_id_idx on public.candidate_status_history (candidate_id);
create index candidate_status_history_changed_by_idx on public.candidate_status_history (changed_by);

create or replace function private.log_candidate_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.candidate_status_history (candidate_id, from_status, to_status, changed_by)
    values (
      new.id,
      case when tg_op = 'UPDATE' then old.status end,
      new.status,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

revoke all on function private.log_candidate_status_change() from public, anon, authenticated;

create trigger candidates_log_status_change
after insert or update of status on public.candidates
for each row execute function private.log_candidate_status_change();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_skills enable row level security;
alter table public.candidate_opportunities enable row level security;
alter table public.candidate_notes enable row level security;
alter table public.candidate_contacts enable row level security;
alter table public.candidate_status_history enable row level security;
