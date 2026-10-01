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
        <div className="container site-footer__inner">
          <span>tkpool. A talent pool for developers open to new opportunities.</span>
          <span>Submitting a profile does not guarantee employment, an interview, or recruiter contact.</span>
          <a className="site-footer__link" href={COOKIE_POLICY_PATH}>
            Cookie policy
          </a>
          <span>
            Location data from{' '}
            <a className="site-footer__link" href="https://www.geonames.org" target="_blank" rel="noopener">
              GeoNames
            </a>{' '}
            (CC BY 4.0). Role list includes information from the{' '}
            <a className="site-footer__link" href="https://www.onetcenter.org/database.html" target="_blank" rel="noopener">
              O*NET 31.0 Database
            </a>{' '}
            by USDOL/ETA, used under CC BY 4.0. tkpool has modified this information; USDOL/ETA has not approved, endorsed, or
            tested these modifications. O*NET® is a trademark of USDOL/ETA.
          </span>
        </div>
      </footer>
    </>
  );
}
