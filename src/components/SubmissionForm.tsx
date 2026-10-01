import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  CONSENT_TEXT,
  EMPTY_PROFILE,
  SALARY_CURRENCIES,
  SALARY_PERIODS,
  WORK_PREFERENCES,
  type ProfileErrors,
  type ProfileField,
  type ProfileFormValues,
} from '../lib/profile';
import { AlreadySubmittedError, SubmissionError, submitProfile } from '../lib/submitProfile';
import { FIELD_ORDER, validateField, validateProfile } from '../lib/validation';
import { CvUpload } from './CvUpload';
import { Field, FieldError, RequiredMark, describedBy } from './Field';
import { AlertIcon } from './Icons';
import { LocationInput } from './LocationInput';
import { RoleInput } from './RoleInput';
import { SkillsInput } from './SkillsInput';

const FIELD_IDS: Record<ProfileField, string> = {
  fullName: 'full-name',
  email: 'email',
  location: 'location',
  desiredRole: 'desired-role',
  yearsExperience: 'years-experience',
  skills: 'skills',
  workPreference: 'work-preference-remote',
  salaryAmount: 'salary-amount',
  salaryCurrency: 'salary-currency',
  salaryPeriod: 'salary-period',
  githubUrl: 'github-url',
  portfolioUrl: 'portfolio-url',
  linkedinUrl: 'linkedin-url',
  cv: 'cv',
  consent: 'consent',
};

type TextField = 'fullName' | 'email' | 'yearsExperience' | 'salaryAmount' | 'githubUrl' | 'portfolioUrl' | 'linkedinUrl';

const OPTIONAL_FIELDS: ReadonlySet<ProfileField> = new Set(['githubUrl', 'portfolioUrl', 'linkedinUrl']);

interface SectionProps {
  number: string;
  title: string;
  description?: string;
  children: ReactNode;
}

function Section({ number, title, description, children }: SectionProps) {
  return (
    <fieldset className="form-section">
      <legend className="form-section__legend">
        <span className="form-section__number">{number}</span>
        {title}
      </legend>
      {description && <p className="form-section__description">{description}</p>}
      <div className="form-section__body">{children}</div>
    </fieldset>
  );
}

interface SubmissionFormProps {
  onSubmitted: (result: { cvReplaced: boolean }) => void;
}

export function SubmissionForm({ onSubmitted }: SubmissionFormProps) {
  const [values, setValues] = useState<ProfileFormValues>(EMPTY_PROFILE);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [touched, setTouched] = useState<Partial<Record<ProfileField, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const latest = useRef(values);
  latest.current = values;

  function update<K extends ProfileField>(field: K, value: ProfileFormValues[K], touch = false) {
    const next = { ...latest.current, [field]: value };
    latest.current = next;
    setValues(next);
    if (field === 'email') setAlreadySubmitted(false);
    if (touch) setTouched((prev) => ({ ...prev, [field]: true }));
    if (touch || touched[field] || errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, next) }));
    }
  }

  function markTouched(field: ProfileField) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors((prev) => ({ ...prev, [field]: validateField(field, latest.current) }));
  }

  function textProps(field: TextField) {
    const id = FIELD_IDS[field];
    return {
      id,
      name: field,
      className: 'input',
      value: values[field],
      'aria-required': OPTIONAL_FIELDS.has(field) ? undefined : true,
      'aria-invalid': errors[field] ? true : undefined,
      onChange: (event: { target: { value: string } }) => update(field, event.target.value),
      onBlur: () => markTouched(field),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = validateProfile(values);
    setErrors(nextErrors);
    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }

    if (honeypot) {
      onSubmitted({ cvReplaced: false });
      return;
    }

    if (!navigator.onLine) {
      setSubmitError('You appear to be offline. Reconnect to the internet and submit again. Your answers are still here.');
      return;
    }

    setSubmitting(true);
    try {
      await submitProfile(values, { replaceCv: alreadySubmitted });
      onSubmitted({ cvReplaced: alreadySubmitted });
    } catch (error) {
      if (error instanceof AlreadySubmittedError) {
        setAlreadySubmitted(true);
      } else {
        setSubmitError(
          error instanceof SubmissionError ? error.message : 'Something went wrong while submitting. Please try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form__trap" aria-hidden="true">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>

      <p className="form__legend">
        <RequiredMark /> Required
      </p>

      <Section number="01" title="About you">
        <Field id={FIELD_IDS.fullName} label="Full name" required error={errors.fullName}>
          <input {...textProps('fullName')} autoComplete="name" aria-describedby={describedBy(FIELD_IDS.fullName, undefined, errors.fullName)} />
        </Field>
        <Field
          id={FIELD_IDS.email}
          label="Email"
          required
          hint="This is how recruiters will contact you. Each email address can only submit one profile."
          error={errors.email}
          className="field--key"
        >
          <input
            {...textProps('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-describedby={describedBy(FIELD_IDS.email, 'hint', errors.email)}
          />
        </Field>
        <Field
          id={FIELD_IDS.location}
          label="Location"
          required
          hint="Start typing and choose from the list. If your town is not listed, pick the nearest city or just your country."
          error={errors.location}
        >
          <LocationInput
            id={FIELD_IDS.location}
            value={values.location}
            onChange={(location) => update('location', location)}
            onBlur={() => markTouched('location')}
            invalid={Boolean(errors.location)}
            describedBy={describedBy(FIELD_IDS.location, 'hint', errors.location)}
          />
        </Field>
      </Section>

      <Section number="02" title="Experience">
        <div className="form-grid form-grid--wide-first">
          <Field
            id={FIELD_IDS.desiredRole}
            label="Desired role"
            required
            hint="Pick from the list, or type your own and choose Add."
            error={errors.desiredRole}
          >
            <RoleInput
              id={FIELD_IDS.desiredRole}
              value={values.desiredRole}
              onChange={(role) => update('desiredRole', role)}
              onBlur={() => markTouched('desiredRole')}
              invalid={Boolean(errors.desiredRole)}
              describedBy={describedBy(FIELD_IDS.desiredRole, 'hint', errors.desiredRole)}
            />
          </Field>
          <Field id={FIELD_IDS.yearsExperience} label="Years of experience" required error={errors.yearsExperience}>
            <input
              {...textProps('yearsExperience')}
              type="number"
              inputMode="numeric"
              min={0}
              max={50}
              step={1}
              aria-describedby={describedBy(FIELD_IDS.yearsExperience, undefined, errors.yearsExperience)}
            />
          </Field>
        </div>
        <Field
          id={FIELD_IDS.skills}
          label="Skills"
          required
          hint="Languages, frameworks, tools. Press Enter or use commas to add each one."
          error={errors.skills}
        >
          <SkillsInput
            id={FIELD_IDS.skills}
            value={values.skills}
            onChange={(skills) => update('skills', skills)}
            onBlur={() => markTouched('skills')}
            invalid={Boolean(errors.skills)}
            describedBy={describedBy(FIELD_IDS.skills, 'hint', errors.skills)}
          />
        </Field>
      </Section>

      <Section number="03" title="Preferences">
        <div className={`field${errors.workPreference ? ' field--invalid' : ''}`}>
          <div className="field__label" id="work-preference-label">
            <span>
              Work preference
              <RequiredMark />
            </span>
          </div>
          <div
            className="choice-grid"
            role="radiogroup"
            aria-labelledby="work-preference-label"
            aria-required="true"
            aria-describedby={errors.workPreference ? 'work-preference-error' : undefined}
          >
            {WORK_PREFERENCES.map((option) => (
              <label key={option.value} className="choice">
                <input
                  type="radio"
                  id={`work-preference-${option.value}`}
                  name="workPreference"
                  value={option.value}
                  checked={values.workPreference === option.value}
                  onChange={() => update('workPreference', option.value)}
                />
                <span className="choice__label">{option.label}</span>
              </label>
            ))}
          </div>
          {errors.workPreference && <FieldError id="work-preference-error" message={errors.workPreference} />}
        </div>

        <div className={`field field--key${errors.salaryAmount ? ' field--invalid' : ''}`}>
          <label className="field__label" htmlFor={FIELD_IDS.salaryAmount}>
            <span>
              Expected salary
              <RequiredMark />
            </span>
          </label>
          <p className="field__hint" id="salary-amount-hint">
            The amount you would want in your next role. Only shared with recruiters and companies considering you.
          </p>
          <div className="salary">
            <select
              id={FIELD_IDS.salaryCurrency}
              className="input salary__currency"
              aria-label="Currency"
              value={values.salaryCurrency}
              onChange={(event) => update('salaryCurrency', event.target.value as ProfileFormValues['salaryCurrency'])}
            >
              {SALARY_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
            <input
              {...textProps('salaryAmount')}
              className="input salary__amount"
              inputMode="decimal"
              placeholder="0"
              aria-describedby={describedBy(FIELD_IDS.salaryAmount, 'hint', errors.salaryAmount)}
            />
            <select
              id={FIELD_IDS.salaryPeriod}
              className="input salary__period"
              aria-label="Salary period"
              value={values.salaryPeriod}
              onChange={(event) => update('salaryPeriod', event.target.value as ProfileFormValues['salaryPeriod'])}
            >
              {SALARY_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>
          {errors.salaryAmount && <FieldError id="salary-amount-error" message={errors.salaryAmount} />}
        </div>
      </Section>

      <Section number="04" title="Links" description="Add any that apply. Recruiters use these to get a feel for your work.">
        <Field id={FIELD_IDS.githubUrl} label="GitHub" optional error={errors.githubUrl}>
          <input
            {...textProps('githubUrl')}
            type="url"
            inputMode="url"
            placeholder="github.com/username"
            aria-describedby={describedBy(FIELD_IDS.githubUrl, undefined, errors.githubUrl)}
          />
        </Field>
        <Field id={FIELD_IDS.portfolioUrl} label="Portfolio" optional error={errors.portfolioUrl}>
          <input
            {...textProps('portfolioUrl')}
            type="url"
            inputMode="url"
            placeholder="yourname.dev"
            aria-describedby={describedBy(FIELD_IDS.portfolioUrl, undefined, errors.portfolioUrl)}
          />
        </Field>
        <Field id={FIELD_IDS.linkedinUrl} label="LinkedIn" optional error={errors.linkedinUrl}>
          <input
            {...textProps('linkedinUrl')}
            type="url"
            inputMode="url"
            placeholder="linkedin.com/in/username"
            aria-describedby={describedBy(FIELD_IDS.linkedinUrl, undefined, errors.linkedinUrl)}
          />
        </Field>
      </Section>

      <Section number="05" title="CV">
        <Field id={FIELD_IDS.cv} label="Upload your CV" required error={errors.cv}>
          <CvUpload
            id={FIELD_IDS.cv}
            file={values.cv}
            onChange={(file) => update('cv', file, true)}
            invalid={Boolean(errors.cv)}
            describedBy={describedBy(FIELD_IDS.cv, undefined, errors.cv)}
          />
        </Field>
        <p className="form-note">Your CV is stored privately. It is never publicly accessible.</p>
      </Section>

      <Section number="06" title="Consent">
        <div className="notice">
          <p>
            By submitting, you are joining a talent pool, not applying for a specific job. Your profile, CV and links may be reviewed by
            us and shared with recruiters, recruitment agencies and companies looking for developers.
          </p>
          <p>Submitting a profile does not guarantee employment, an interview, or contact from a recruiter.</p>
          <p>
            See our{' '}
            <a className="text-link" href="/cookies" target="_blank" rel="noopener">
              cookie policy
            </a>{' '}
            for what this site stores on your device.
          </p>
        </div>
        <div className={`consent${errors.consent ? ' consent--invalid' : ''}`}>
          <input
            type="checkbox"
            id={FIELD_IDS.consent}
            checked={values.consent}
            aria-required="true"
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? 'consent-error' : undefined}
            onChange={(event) => update('consent', event.target.checked, true)}
          />
          <label htmlFor={FIELD_IDS.consent}>
            {CONSENT_TEXT}
            <RequiredMark />
          </label>
        </div>
        {errors.consent && <FieldError id="consent-error" message={errors.consent} />}
      </Section>

      {alreadySubmitted && (
        <div className="duplicate" role="alert">
          <p className="duplicate__title">{values.email.trim()} is already in the talent pool.</p>
          <p>
            Each email address can only submit one profile. If you want to update your CV, select <strong>Update my CV</strong> and we
            will replace the CV on your existing profile with the one attached above. Your other details stay as you first submitted
            them.
          </p>
          <p>If this is not your profile, change the email address above.</p>
        </div>
      )}

      <div className="form__footer">
        <div aria-live="polite" className="form__status">
          {submitError && (
            <div className="alert" role="alert">
              <AlertIcon />
              <p>{submitError}</p>
            </div>
          )}
          {!submitError && errorCount > 0 && (
            <p className="form__error-count">
              {errorCount === 1 ? '1 field needs attention.' : `${errorCount} fields need attention.`}
            </p>
          )}
          {!submitError && errorCount === 0 && !values.consent && (
            <p className="form__hint">Tick the consent box above to submit.</p>
          )}
        </div>
        <button
          type="submit"
          className="button button--primary button--large"
          disabled={submitting || !values.consent}
          aria-busy={submitting}
        >
          {alreadySubmitted
            ? submitting
              ? 'Updating your CV...'
              : 'Update my CV'
            : submitting
              ? 'Submitting your profile...'
              : 'Submit Your Profile'}
        </button>
      </div>
    </form>
  );
}
