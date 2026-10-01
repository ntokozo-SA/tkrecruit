import { useEffect, useState, type ReactNode } from 'react';
import { AlertIcon, ArrowLeftIcon, ExternalLinkIcon, FileIcon } from '../components/Icons';
import {
  CANDIDATE_STATUSES,
  getCandidate,
  getCvLinks,
  updateCandidateStatus,
  type CandidateProfile,
  type CandidateStatus,
  type CvLinks,
} from './adminApi';
import { experienceLabel, formatDate, formatDateTime, salaryLabel, statusLabel, workPreferenceLabel } from './format';
import { Link, lastCandidateListPath } from './router';

type PageState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ready'; candidate: CandidateProfile };

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="detail">
      <dt className="detail__label">{label}</dt>
      <dd className="detail__value">{children}</dd>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel" aria-label={title}>
      <h2 className="panel__title">{title}</h2>
      {children}
    </section>
  );
}

function ExternalLink({ href }: { href: string | null }) {
  if (!href) return <span className="detail__empty">Not provided</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-link profile-link">
      <span>{href.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')}</span>
      <ExternalLinkIcon />
      <span className="visually-hidden">(opens in a new tab)</span>
    </a>
  );
}

function CvPanel({ candidate }: { candidate: CandidateProfile }) {
  const [links, setLinks] = useState<CvLinks | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCvLinks(candidate.cv_path, candidate.full_name)
      .then((result) => !cancelled && setLinks(result))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [candidate.cv_path, candidate.full_name]);

  const extension = candidate.cv_path.split('.').pop()?.toUpperCase();

  return (
    <Panel title="CV">
      <div className="cv-card">
        <FileIcon className="cv-card__icon" width={20} height={20} />
        <span className="cv-card__name">{extension} document</span>
        {failed ? (
          <span className="field__error">
            <AlertIcon />
            <span>The CV could not be loaded.</span>
          </span>
        ) : (
          <span className="cv-card__actions">
            <a
              className="button button--secondary button--small"
              href={links?.view}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!links}
              onClick={(event) => !links && event.preventDefault()}
            >
              Open
            </a>
            <a
              className="button button--primary button--small"
              href={links?.download}
              aria-disabled={!links}
              onClick={(event) => !links && event.preventDefault()}
            >
              Download
            </a>
          </span>
        )}
      </div>
      {extension !== 'PDF' && <p className="form-note">Word documents download instead of opening in the browser.</p>}
    </Panel>
  );
}

function StatusControl({ candidate, onChanged }: { candidate: CandidateProfile; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(status: CandidateStatus) {
    setSaving(true);
    setError(null);
    try {
      await updateCandidateStatus(candidate.id, status);
      onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update the status.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="status-control">
      <label htmlFor="candidate-status" className="status-control__label">
        Status
      </label>
      <select
        id="candidate-status"
        className="input status-control__select"
        value={candidate.status}
        disabled={saving}
        onChange={(event) => void handleChange(event.target.value as CandidateStatus)}
      >
        {CANDIDATE_STATUSES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="field__error" role="alert">
          <AlertIcon />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export function CandidateProfilePage({ id }: { id: string }) {
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getCandidate(id)
      .then((candidate) => {
        if (cancelled) return;
        setState(candidate ? { status: 'ready', candidate } : { status: 'not-found' });
      })
      .catch(() => !cancelled && setState({ status: 'error' }));
    return () => {
      cancelled = true;
    };
  }, [id, reload]);

  useEffect(() => {
    if (state.status !== 'ready') return;
    const previousTitle = document.title;
    document.title = `${state.candidate.full_name} · tkpool back office`;
    return () => {
      document.title = previousTitle;
    };
  }, [state]);

  const backLink = (
    <Link href={lastCandidateListPath()} className="admin-back">
      <ArrowLeftIcon />
      All candidates
    </Link>
  );

  if (state.status === 'loading') {
    return (
      <div className="container admin-page">
        {backLink}
        <p className="admin-state admin-state--muted">Loading profile…</p>
      </div>
    );
  }

  if (state.status === 'not-found' || state.status === 'error') {
    return (
      <div className="container admin-page">
        {backLink}
        <div className="admin-state admin-empty">
          {state.status === 'not-found' ? (
            <>
              <p className="admin-empty__title">Candidate not found</p>
              <p>This profile may have been removed, or the link is incorrect.</p>
            </>
          ) : (
            <>
              <p className="alert" role="alert">
                <AlertIcon />
                <span>Could not load this candidate. Check your connection and try again.</span>
              </p>
              <button type="button" className="button button--secondary" onClick={() => setReload((value) => value + 1)}>
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const { candidate } = state;
  const salary = salaryLabel(candidate);
  const consent = candidate.consents[0];

  return (
    <div className="container admin-page">
      {backLink}

      <div className="profile-head">
        <div className="profile-head__main">
          <h1 className="admin-page__title">{candidate.full_name}</h1>
          <p className="profile-head__role">
            {candidate.desired_role} · {experienceLabel(candidate.years_experience)} experience
          </p>
          <p className="profile-head__meta">
            <span className={`status status--${candidate.status}`}>{statusLabel(candidate.status)}</span>
            <span>Submitted {formatDate(candidate.submitted_at)}</span>
            {candidate.cv_updated_at && <span>CV updated {formatDate(candidate.cv_updated_at)}</span>}
          </p>
        </div>
        <StatusControl candidate={candidate} onChanged={() => setReload((value) => value + 1)} />
      </div>

      <div className="profile-grid">
        <div className="profile-grid__main">
          <Panel title="Contact">
            <dl className="details">
              <Detail label="Email">
                <a className="text-link" href={`mailto:${candidate.email}`}>
                  {candidate.email}
                </a>
              </Detail>
              <Detail label="Location">{candidate.location}</Detail>
            </dl>
          </Panel>

          <Panel title="What they are looking for">
            <dl className="details">
              <Detail label="Desired role">{candidate.desired_role}</Detail>
              <Detail label="Experience">{experienceLabel(candidate.years_experience)}</Detail>
              <Detail label="Work preference">{workPreferenceLabel(candidate.work_preference)}</Detail>
              <Detail label="Desired salary">{salary ?? <span className="detail__empty">Not provided</span>}</Detail>
            </dl>
          </Panel>

          <Panel title={`Skills (${candidate.skills.length})`}>
            {candidate.skills.length ? (
              <ul className="tag-list">
                {candidate.skills.map((skill) => (
                  <li key={skill} className="tag">
                    {skill}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="detail__empty">No skills listed</p>
            )}
          </Panel>

          <Panel title="Links">
            <dl className="details">
              <Detail label="GitHub">
                <ExternalLink href={candidate.github_url} />
              </Detail>
              <Detail label="Portfolio">
                <ExternalLink href={candidate.portfolio_url} />
              </Detail>
              <Detail label="LinkedIn">
                <ExternalLink href={candidate.linkedin_url} />
              </Detail>
            </dl>
          </Panel>
        </div>

        <aside className="profile-grid__side">
          <CvPanel candidate={candidate} />

          <Panel title="Consent">
            {consent ? (
              <dl className="details details--stacked">
                <Detail label="Version">
                  <code>{consent.consent_version}</code>
                </Detail>
                <Detail label="Given">{formatDateTime(consent.granted_at)}</Detail>
                {consent.withdrawn_at && <Detail label="Withdrawn">{formatDateTime(consent.withdrawn_at)}</Detail>}
              </dl>
            ) : (
              <p className="detail__empty">No consent record</p>
            )}
          </Panel>

          <Panel title="Status history">
            {candidate.status_history.length ? (
              <ol className="timeline">
                {candidate.status_history.map((change) => (
                  <li key={change.id} className="timeline__item">
                    <span className="timeline__what">
                      {change.from_status
                        ? `${statusLabel(change.from_status)} → ${statusLabel(change.to_status)}`
                        : statusLabel(change.to_status)}
                    </span>
                    <span className="timeline__when">{formatDateTime(change.changed_at)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="detail__empty">No changes yet</p>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
