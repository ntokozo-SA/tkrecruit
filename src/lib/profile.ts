export const WORK_PREFERENCES = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'Onsite' },
  { value: 'remote_hybrid', label: 'Remote / Hybrid' },
  { value: 'open_to_all', label: 'Open to all' },
] as const;

export type WorkPreference = (typeof WORK_PREFERENCES)[number]['value'];

export const SALARY_CURRENCIES = ['ZAR', 'USD', 'EUR', 'GBP'] as const;
export type SalaryCurrency = (typeof SALARY_CURRENCIES)[number];

export const SALARY_PERIODS = [
  { value: 'year', label: 'per year' },
  { value: 'month', label: 'per month' },
] as const;
export type SalaryPeriod = (typeof SALARY_PERIODS)[number]['value'];

export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const CV_EXTENSIONS = ['pdf', 'doc', 'docx'] as const;
export const CV_ACCEPT = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const MAX_SKILLS = 30;

// Must match the row in public.consent_documents for this version.
export const CONSENT_VERSION = 'talent-pool-v1';
export const CONSENT_TEXT =
  'I agree to have my profile considered for relevant technology opportunities and understand that my information may be shared with recruiters, recruitment agencies, and companies for recruitment purposes.';

export interface ProfileFormValues {
  fullName: string;
  email: string;
  location: string;
  desiredRole: string;
  yearsExperience: string;
  skills: string[];
  workPreference: WorkPreference | '';
  salaryAmount: string;
  salaryCurrency: SalaryCurrency;
  salaryPeriod: SalaryPeriod;
  githubUrl: string;
  portfolioUrl: string;
  linkedinUrl: string;
  cv: File | null;
  consent: boolean;
}

export type ProfileField = keyof ProfileFormValues;
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export const EMPTY_PROFILE: ProfileFormValues = {
  fullName: '',
  email: '',
  location: '',
  desiredRole: '',
  yearsExperience: '',
  skills: [],
  workPreference: '',
  salaryAmount: '',
  salaryCurrency: 'ZAR',
  salaryPeriod: 'year',
  githubUrl: '',
  portfolioUrl: '',
  linkedinUrl: '',
  cv: null,
  consent: false,
};
