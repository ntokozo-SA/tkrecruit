import {
  CV_EXTENSIONS,
  CV_MAX_BYTES,
  MAX_SKILLS,
  type ProfileErrors,
  type ProfileField,
  type ProfileFormValues,
} from './profile';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

function hostMatches(value: string, domain: string): boolean {
  const host = new URL(value).hostname.toLowerCase();
  return host === domain || host.endsWith(`.${domain}`);
}

/** Adds https:// when someone types "github.com/me". Leaves blanks alone. */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

function checkLength(value: string, label: string, min: number, max: number): string | undefined {
  const length = value.trim().length;
  if (length === 0) return `Enter your ${label}.`;
  if (length < min) return `${capitalize(label)} looks too short.`;
  if (length > max) return `${capitalize(label)} must be ${max} characters or fewer.`;
  return undefined;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function checkUrl(value: string, label: string, domain?: string): string | undefined {
  const normalized = normalizeUrl(value);
  if (!normalized) return undefined;
  if (normalized.length > 300 || !isHttpUrl(normalized)) return `Enter a valid ${label} URL.`;
  if (domain && !hostMatches(normalized, domain)) return `This should be a ${domain} link.`;
  return undefined;
}

export function validateField(field: ProfileField, values: ProfileFormValues): string | undefined {
  switch (field) {
    case 'fullName':
      return checkLength(values.fullName, 'full name', 2, 120);
    case 'email': {
      const email = values.email.trim();
      if (!email) return 'Enter your email address.';
      if (email.length > 254 || !EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
      return undefined;
    }
    case 'location':
      if (!values.location.trim()) return 'Search for your city or country and choose it from the list.';
      return checkLength(values.location, 'location', 2, 120);
    case 'desiredRole':
      if (!values.desiredRole.trim()) return 'Search for your role, or type your own and choose Add.';
      return checkLength(values.desiredRole, 'desired role', 2, 120);
    case 'yearsExperience': {
      const raw = values.yearsExperience.trim();
      if (!raw) return 'Enter your years of experience.';
      const years = Number(raw);
      if (!Number.isInteger(years) || years < 0 || years > 50) return 'Use a whole number between 0 and 50.';
      return undefined;
    }
    case 'skills':
      if (values.skills.length === 0) return 'Add at least one skill.';
      if (values.skills.length > MAX_SKILLS) return `Add up to ${MAX_SKILLS} skills.`;
      return undefined;
    case 'workPreference':
      return values.workPreference ? undefined : 'Choose a work preference.';
    case 'salaryAmount': {
      const raw = values.salaryAmount.replace(/[\s,]/g, '');
      if (!raw) return 'Enter your expected salary.';
      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount <= 0) return 'Enter a positive number.';
      if (amount >= 1e10) return 'That amount is too large.';
      return undefined;
    }
    case 'githubUrl':
      return checkUrl(values.githubUrl, 'GitHub', 'github.com');
    case 'portfolioUrl':
      return checkUrl(values.portfolioUrl, 'portfolio');
    case 'linkedinUrl':
      return checkUrl(values.linkedinUrl, 'LinkedIn', 'linkedin.com');
    case 'cv': {
      const file = values.cv;
      if (!file) return 'Upload your CV.';
      if (!(CV_EXTENSIONS as readonly string[]).includes(fileExtension(file.name))) {
        return 'Upload a PDF, DOC or DOCX file.';
      }
      if (file.size > CV_MAX_BYTES) return 'Your CV must be 5 MB or smaller.';
      if (file.size === 0) return 'This file is empty.';
      return undefined;
    }
    case 'consent':
      return values.consent ? undefined : 'Tick this box to agree before submitting.';
    case 'salaryCurrency':
    case 'salaryPeriod':
      return undefined;
  }
}

export const FIELD_ORDER: ProfileField[] = [
  'fullName',
  'email',
  'location',
  'desiredRole',
  'yearsExperience',
  'skills',
  'workPreference',
  'salaryAmount',
  'githubUrl',
  'portfolioUrl',
  'linkedinUrl',
  'cv',
  'consent',
];

export function validateProfile(values: ProfileFormValues): ProfileErrors {
  const errors: ProfileErrors = {};
  for (const field of FIELD_ORDER) {
    const message = validateField(field, values);
    if (message) errors[field] = message;
  }
  return errors;
}
