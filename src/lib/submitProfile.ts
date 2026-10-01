import { CONSENT_VERSION, type ProfileFormValues } from './profile';
import { supabase } from './supabase';
import { fileExtension, normalizeUrl } from './validation';

export class SubmissionError extends Error {}

/** The email already has a profile. The candidate can retry with `replaceCv`. */
export class AlreadySubmittedError extends SubmissionError {}

const CV_BUCKET = 'cvs';

const CV_CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// Visitors cannot delete from the bucket, so a retry must reuse the earlier upload.
const uploadedCvs = new WeakMap<File, string>();

function messageForDatabaseError(message: string): string {
  if (message.startsWith('cv_not_found')) return 'We could not find your uploaded CV. Please attach it again and resubmit.';
  if (message.startsWith('invalid_url')) return 'One of your links is not a valid URL. Check GitHub, portfolio and LinkedIn.';
  if (message.startsWith('skills_required') || message.startsWith('too_many_skills') || message.startsWith('invalid_skill')) {
    return 'Check your skills list and try again.';
  }
  if (message.startsWith('salary_required')) return 'Enter your expected salary before submitting.';
  if (message.startsWith('consent_required')) return 'You need to agree to the consent statement before submitting.';
  if (message.startsWith('invalid_field') || message.startsWith('missing_required_field')) {
    return 'Some of your details could not be saved. Check the form and try again.';
  }
  return 'Something went wrong while saving your profile. Please try again in a moment.';
}

async function uploadCv(file: File): Promise<string> {
  const cached = uploadedCvs.get(file);
  if (cached) return cached;

  const extension = fileExtension(file.name);
  const cvPath = `submissions/${crypto.randomUUID()}.${extension}`;

  const upload = await supabase!.storage.from(CV_BUCKET).upload(cvPath, file, {
    contentType: CV_CONTENT_TYPES[extension],
    upsert: false,
  });

  if (upload.error) {
    throw new SubmissionError('Your CV could not be uploaded. Check that it is a PDF, DOC or DOCX under 5 MB and try again.');
  }

  uploadedCvs.set(file, cvPath);
  return cvPath;
}

export async function submitProfile(values: ProfileFormValues, { replaceCv = false } = {}): Promise<void> {
  if (!supabase) {
    throw new SubmissionError('Submissions are not available right now because the site is not connected to its database.');
  }
  if (!values.cv || !values.workPreference || !values.consent) {
    throw new SubmissionError('Your submission is incomplete.');
  }

  const cvPath = await uploadCv(values.cv);

  const { error } = await supabase.rpc('submit_candidate_profile', {
    p_full_name: values.fullName.trim(),
    p_email: values.email.trim(),
    p_location: values.location.trim(),
    p_years_experience: Number(values.yearsExperience),
    p_desired_role: values.desiredRole.trim(),
    p_desired_salary_amount: Number(values.salaryAmount.replace(/[\s,]/g, '')),
    p_desired_salary_currency: values.salaryCurrency,
    p_desired_salary_period: values.salaryPeriod,
    p_work_preference: values.workPreference,
    p_github_url: normalizeUrl(values.githubUrl) || null,
    p_portfolio_url: normalizeUrl(values.portfolioUrl) || null,
    p_linkedin_url: normalizeUrl(values.linkedinUrl) || null,
    p_skills: values.skills,
    p_cv_path: cvPath,
    p_consent_version: CONSENT_VERSION,
    p_consent_given: values.consent,
    p_user_agent: navigator.userAgent,
    p_replace_cv: replaceCv,
  });

  if (error) {
    if (error.message.startsWith('already_submitted')) {
      throw new AlreadySubmittedError('A profile with this email address is already in the talent pool.');
    }
    throw new SubmissionError(messageForDatabaseError(error.message));
  }

  uploadedCvs.delete(values.cv);
}
