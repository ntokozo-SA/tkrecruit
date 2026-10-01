import { SALARY_PERIODS, WORK_PREFERENCES } from '../lib/profile';
import { CANDIDATE_STATUSES, type CandidateProfile, type CandidateStatus } from './adminApi';

const dateFormat = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('en-ZA', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value: string): string {
  return dateFormat.format(new Date(value));
}

export function formatDateTime(value: string): string {
  return dateTimeFormat.format(new Date(value));
}

export function workPreferenceLabel(value: string): string {
  return WORK_PREFERENCES.find((option) => option.value === value)?.label ?? value;
}

export function statusLabel(value: CandidateStatus): string {
  return CANDIDATE_STATUSES.find((option) => option.value === value)?.label ?? value;
}

export function experienceLabel(years: number): string {
  return years === 1 ? '1 year' : `${years} years`;
}

export function salaryLabel(candidate: CandidateProfile): string | null {
  const { desired_salary_amount: amount, desired_salary_currency: currency, desired_salary_period: period } = candidate;
  if (amount == null || !currency || !period) return null;

  let formatted: string;
  try {
    formatted = new Intl.NumberFormat('en-ZA', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    formatted = `${currency} ${amount.toLocaleString('en-ZA')}`;
  }
  const periodLabel = SALARY_PERIODS.find((option) => option.value === period)?.label ?? period;
  return `${formatted} ${periodLabel}`;
}
