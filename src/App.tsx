import { useState } from 'react';
import { COOKIE_POLICY_PATH, CookiePolicy } from './components/CookiePolicy';
import { GoodToKnow, Hero, HowItWorks } from './components/Landing';
import { SubmissionForm } from './components/SubmissionForm';
import { SubmissionSuccess } from './components/SubmissionSuccess';

function Logo({ href }: { href: string }) {
  return (
    <a href={href} className="logo" aria-label="tkpool home">
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
        <rect x="1" y="1" width="20" height="20" rx="3" fill="currentColor" />
        <path d="M6 8h10M6 11.5h6M6 15h8" stroke="var(--paper)" strokeWidth="1.8" strokeLinecap="square" />
      </svg>
      <span>tkpool</span>
    </a>
  );
}

const isCookiePolicy = window.location.pathname.replace(/\/+$/, '') === COOKIE_POLICY_PATH;

export default function App() {
  const [submission, setSubmission] = useState<{ cvReplaced: boolean } | null>(null);
  const showNav = !submission && !isCookiePolicy;
  const sectionBase = isCookiePolicy ? '/' : '';

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header" id="top">
        <div className="container site-header__inner">
          <Logo href={isCookiePolicy ? '/' : '#top'} />
          {showNav && (
            <nav className="site-header__nav" aria-label="Main">
              <a href="#how-it-works" className="site-header__link">
                How it works
              </a>
              <a href="#submit" className="button button--secondary button--small">
                Submit your profile
              </a>
            </nav>
          )}
        </div>
      </header>

      <main id="main">
        {isCookiePolicy ? (
          <CookiePolicy />
        ) : submission ? (
          <SubmissionSuccess cvReplaced={submission.cvReplaced} />
        ) : (
          <>
            <Hero />
            <HowItWorks />
            <GoodToKnow />
            <section id="submit" className="section submit" aria-labelledby="submit-title">
              <div className="container submit__grid">
                <div className="submit__intro">
                  <p className="eyebrow">Your profile</p>
                  <h2 id="submit-title" className="section__title">
                    Submit your profile
                  </h2>
                  <p>
                    Fill this in once. Fields marked <span className="field__required">*</span> are required. Each email address can submit
                    one profile; if you have already submitted, you can come back and update your CV.
                  </p>
                  <div className="submit__ready">
                    <p className="submit__ready-title">Have these ready</p>
                    <ul>
                      <li>Your CV as a PDF, DOC or DOCX, up to 5 MB</li>
                      <li>Your expected salary for your next role</li>
                      <li>Links to your GitHub, portfolio or LinkedIn, if you have them</li>
                      <li>The role you want next and your preferred way of working</li>
                    </ul>
                  </div>
                </div>
                <div className="submit__form">
                  <SubmissionForm onSubmitted={setSubmission} />
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="container">
          <div className="site-footer__top">
            <div className="site-footer__brand">
              <Logo href={isCookiePolicy || submission ? '/' : '#top'} />
              <p className="site-footer__tagline">A talent pool for developers open to new opportunities.</p>
            </div>
            <nav className="site-footer__nav" aria-label="Footer">
              {!submission && (
                <div className="site-footer__col">
                  <p className="site-footer__heading">Candidates</p>
                  <ul>
                    <li>
                      <a className="site-footer__link" href={`${sectionBase}#how-it-works`}>
                        How it works
                      </a>
                    </li>
                    <li>
                      <a className="site-footer__link" href={`${sectionBase}#what-to-expect`}>
                        What to expect
                      </a>
                    </li>
                    <li>
                      <a className="site-footer__link" href={`${sectionBase}#submit`}>
                        Submit your profile
                      </a>
                    </li>
                  </ul>
                </div>
              )}
              <div className="site-footer__col">
                <p className="site-footer__heading">Legal</p>
                <ul>
                  <li>
                    <a className="site-footer__link" href={COOKIE_POLICY_PATH}>
                      Cookie policy
                    </a>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
          <div className="site-footer__bottom">
            <span>© {new Date().getFullYear()} tkpool. All rights reserved.</span>
            <span>Submitting a profile does not guarantee employment, an interview, or recruiter contact.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
