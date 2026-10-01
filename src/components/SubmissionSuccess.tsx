import { useEffect, useRef } from 'react';
import { CheckIcon } from './Icons';

const NEXT_STEPS = [
  'We review your profile.',
  'When a relevant opportunity comes up, we may share your profile with the recruiter or company hiring.',
  'If they are interested, they or we will contact you at the email address you provided.',
];

export function SubmissionSuccess({ cvReplaced = false }: { cvReplaced?: boolean }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, []);

  return (
    <section className="success" aria-labelledby="success-title">
      <div className="container success__inner">
        <div className="success__badge">
          <CheckIcon width={20} height={20} />
        </div>
        <h1 id="success-title" className="success__title" ref={headingRef} tabIndex={-1}>
          {cvReplaced ? 'Your CV has been updated.' : "You're in the talent pool."}
        </h1>
        <p className="success__lead">
          {cvReplaced
            ? 'We replaced the CV on your existing profile with the one you just uploaded. Your other details stay as you first submitted them, and recruiters will see your new CV from now on.'
            : "Your profile has been submitted successfully. We'll consider your profile for relevant opportunities and may connect you with recruiters or companies looking for developers with your skills."}
        </p>

        <div className="success__next">
          <h2 className="success__next-title">What happens next</h2>
          <ol className="success__list">
            {NEXT_STEPS.map((step, index) => (
              <li key={step}>
                <span className="step__number">{String(index + 1).padStart(2, '0')}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="success__note">
          There is nothing else you need to do. Submitting a profile does not guarantee employment, an interview, or contact from a recruiter.
        </p>
      </div>
    </section>
  );
}
