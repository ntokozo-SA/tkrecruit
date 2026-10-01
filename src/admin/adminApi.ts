import type { SalaryPeriod, WorkPreference } from '../lib/profile';
import { adminSupabase } from './adminClient';

export const CANDIDATE_STATUSES = [
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_review', label: 'In review' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'placed', label: 'Placed' },
  { value: 'archived', label: 'Archived' },
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number]['value'];

export interface CandidateListItem {
  id: string;
  full_name: string;
  email: string;
  location: string;
  desired_role: string;
  years_experience: number;
  work_preference: WorkPreference;
  status: CandidateStatus;
  submitted_at: string;
  skills: string[];
}

export interface CandidateConsent {
  consent_version: string;
  granted_at: string;
  withdrawn_at: string | null;
}

export interface CandidateStatusChange {
  id: number;
  from_status: CandidateStatus | null;
  to_status: CandidateStatus;
  changed_at: string;
}

export interface CandidateProfile {
  id: string;
  full_name: string;
  email: string;
  location: string;
  years_experience: number;
  desired_role: string;
  desired_salary_amount: number | null;
  desired_salary_currency: string | null;
  desired_salary_period: SalaryPeriod | null;
  work_preference: WorkPreference;
  github_url: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  cv_path: string;
  cv_updated_at: string | null;
  status: CandidateStatus;
  submitted_at: string;
  updated_at: string;
  skills: string[];
  consents: CandidateConsent[];
  status_history: CandidateStatusChange[];
}

export interface CvLinks {
  view: string;
  download: string;
}

export class AdminApiError extends Error {}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CV_LINK_SECONDS = 60 * 60;

function client() {
  if (!adminSupabase) throw new AdminApiError('The site is not connected to its database. Check the .env file.');
  return adminSupabase;
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await client().rpc('is_admin');
  if (error) throw new AdminApiError('Could not check your access. Please try again.');
  return data === true;
}

export async function listCandidates(
  search: string,
  offset: number,
  limit: number,
): Promise<{ items: CandidateListItem[]; total: number }> {
  const { data, error } = await client().rpc('admin_list_candidates', {
    p_search: search.trim() || null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new AdminApiError('Could not load candidates. Please try again.');

  const rows = (data ?? []) as (CandidateListItem & { total_count: number })[];
  return {
    items: rows.map(({ total_count: _total, ...item }) => item),
    total: rows[0]?.total_count ?? 0,
  };
}

interface CandidateRow extends Omit<CandidateProfile, 'skills' | 'consents' | 'status_history'> {
  candidate_skills: { skills: { name: string } | null }[];
  candidate_consents: CandidateConsent[];
  candidate_status_history: CandidateStatusChange[];
}

export async function getCandidate(id: string): Promise<CandidateProfile | null> {
  if (!UUID_PATTERN.test(id)) return null;

  const { data, error } = await client()
    .from('candidates')
    .select(
      `id, full_name, email, location, years_experience, desired_role,
       desired_salary_amount, desired_salary_currency, desired_salary_period,
       work_preference, github_url, portfolio_url, linkedin_url, cv_path, cv_updated_at,
       status, submitted_at, updated_at,
       candidate_skills ( skills ( name ) ),
       candidate_consents ( consent_version, granted_at, withdrawn_at ),
       candidate_status_history ( id, from_status, to_status, changed_at )`,
    )
    .eq('id', id)
    .maybeSingle<CandidateRow>();

  if (error) throw new AdminApiError('Could not load this candidate. Please try again.');
  if (!data) return null;

  const { candidate_skills, candidate_consents, candidate_status_history, ...candidate } = data;
  return {
    ...candidate,
    skills: candidate_skills
      .map((row) => row.skills?.name)
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    consents: [...candidate_consents].sort((a, b) => b.granted_at.localeCompare(a.granted_at)),
    status_history: [...candidate_status_history].sort((a, b) => b.changed_at.localeCompare(a.changed_at)),
  };
}

export async function updateCandidateStatus(id: string, status: CandidateStatus): Promise<void> {
  const { error } = await client().from('candidates').update({ status }).eq('id', id);
  if (error) throw new AdminApiError('Could not update the status. Please try again.');
}

export async function getCvLinks(cvPath: string, fullName: string): Promise<CvLinks> {
  const extension = cvPath.split('.').pop() ?? 'pdf';
  const fileName = `${fullName.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'candidate'} CV.${extension}`;
  const bucket = client().storage.from('cvs');

  const [view, download] = await Promise.all([
    bucket.createSignedUrl(cvPath, CV_LINK_SECONDS),
    bucket.createSignedUrl(cvPath, CV_LINK_SECONDS, { download: fileName }),
  ]);

  if (view.error || download.error || !view.data || !download.data) {
    throw new AdminApiError('Could not load the CV.');
  }
  return { view: view.data.signedUrl, download: download.data.signedUrl };
}
