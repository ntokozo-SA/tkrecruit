import { ArrowRightIcon, CheckIcon } from './Icons';

const STEPS = [
  {
    title: 'Submit your profile',
    body: 'Fill in one form with your experience, skills, links and CV.',
  },
  {
    title: 'Join the talent pool',
    body: 'Your profile is stored alongside other developers who are open to new roles.',
  },
  {
    title: 'Profile reviewed',
    body: 'When relevant roles come up, we look at your experience and what you are looking for.',
  },
  {
    title: 'Potential connection',
    body: 'If there is a fit, we may share your profile with a recruiter or company, who can then contact you.',
  },
];

const AUDIENCE = ['Recruiters', 'Recruitment agencies', 'Companies hiring developers'];

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="eyebrow">Developer talent pool</p>
          <h1 id="hero-title" className="hero__title">
            Get discovered for your next tech opportunity.
          </h1>
          <p className="hero__lead">
            Submit your developer profile and join our growing talent pool. We connect developers with recruiters, recruitment agencies,
            and companies looking for tech talent.
          </p>
          <div className="hero__actions">
            <a href="#submit" className="button button--primary button--large">
              Submit Your Profile
              <ArrowRightIcon />
            </a>
            <a href="#how-it-works" className="text-link">
              How it works
            </a>
          </div>
        </div>

        <aside className="hero__panel" aria-labelledby="one-profile-title">
          <p className="hero__panel-label">One form, reviewed for many roles</p>
          <h2 id="one-profile-title" className="hero__panel-title">
            One profile. Multiple opportunities.
          </h2>
          <p>
            Submit your information once. You won't need to apply for each role separately. When a relevant opportunity becomes
            available, your profile can be considered for it and you may be contacted.
          </p>
          <p className="hero__panel-subhead">Who may see your profile</p>
          <ul className="check-list">
            {AUDIENCE.map((item) => (
              <li key={item}>
                <CheckIcon />
                {item}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="section" aria-labelledby="how-title">
      <div className="container">
        <div className="section__header">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title" className="section__title">
            You're joining a pool, not applying for one job.
          </h2>
        </div>
        <ol className="steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="step">
              <span className="step__number">{String(index + 1).padStart(2, '0')}</span>
              <h3 className="step__title">{step.title}</h3>
              <p className="step__body">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function GoodToKnow() {
  return (
    <section id="what-to-expect" className="section section--tinted" aria-labelledby="know-title">
      <div className="container">
        <div className="section__header">
          <p className="eyebrow">Before you submit</p>
          <h2 id="know-title" className="section__title">
            What to expect
          </h2>
        </div>
        <div className="facts">
          <div className="fact">
            <h3 className="fact__title">This is not a job application</h3>
            <p>You are not applying for a specific vacancy. Your profile is considered for suitable roles as they come up.</p>
          </div>
          <div className="fact">
            <h3 className="fact__title">No guarantee of contact</h3>
            <p>Submitting a profile does not guarantee employment, an interview, or contact from a recruiter.</p>
          </div>
          <div className="fact">
            <h3 className="fact__title">How your details are used</h3>
            <p>
              Your information may be shared with recruiters, recruitment agencies and companies for recruitment purposes. Your CV is
              stored privately.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
