import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertIcon, SearchIcon } from '../components/Icons';
import { listCandidates, type CandidateListItem } from './adminApi';
import { experienceLabel, formatDate, statusLabel, workPreferenceLabel } from './format';
import { Link, candidateListPath, candidatePath, navigate, rememberListSearch } from './router';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 250;
const VISIBLE_SKILLS = 4;

type LoadState = 'loading' | 'loading-more' | 'ready' | 'error';

function CandidateRow({ candidate }: { candidate: CandidateListItem }) {
  const visibleSkills = candidate.skills.slice(0, VISIBLE_SKILLS);
  const hiddenSkills = candidate.skills.length - visibleSkills.length;

  return (
    <li>
      <Link href={candidatePath(candidate.id)} className="candidate-row">
        <span className="candidate-row__person">
          <span className="candidate-row__name">{candidate.full_name}</span>
          <span className="candidate-row__email">{candidate.email}</span>
        </span>
        <span className="candidate-row__role">
          <span>{candidate.desired_role}</span>
          <span className="candidate-row__meta">
            {experienceLabel(candidate.years_experience)} · {candidate.location}
          </span>
        </span>
        <span className="candidate-row__skills">
          {visibleSkills.map((skill) => (
            <span key={skill} className="tag">
              {skill}
            </span>
          ))}
          {hiddenSkills > 0 && <span className="tag tag--muted">+{hiddenSkills}</span>}
        </span>
        <span className="candidate-row__work">{workPreferenceLabel(candidate.work_preference)}</span>
        <span className="candidate-row__status">
          <span className={`status status--${candidate.status}`}>{statusLabel(candidate.status)}</span>
          <span className="candidate-row__date">{formatDate(candidate.submitted_at)}</span>
        </span>
      </Link>
    </li>
  );
}

export function CandidateList({ search }: { search: string }) {
  const [query, setQuery] = useState(search);
  const [items, setItems] = useState<CandidateListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>('loading');
  const requestId = useRef(0);

  useEffect(() => {
    rememberListSearch(search);
  }, [search]);

  useEffect(() => {
    if (query.trim() === search.trim()) return;
    const timer = window.setTimeout(() => navigate(candidateListPath(query), { replace: true }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  const load = useCallback(
    async (offset: number) => {
      const id = ++requestId.current;
      setState(offset === 0 ? 'loading' : 'loading-more');
      try {
        const result = await listCandidates(search, offset, PAGE_SIZE);
        if (id !== requestId.current) return;
        setItems((previous) => (offset === 0 ? result.items : [...previous, ...result.items]));
        if (offset === 0 || result.items.length > 0) setTotal(result.total);
        setState('ready');
      } catch {
        if (id === requestId.current) setState('error');
      }
    },
    [search],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  const searching = search.trim() !== '';
  const hasMore = items.length < total;

  let summary = '';
  if (state === 'ready' || state === 'loading-more') {
    const noun = total === 1 ? 'candidate' : 'candidates';
    summary = searching ? `${total} ${noun} matching “${search.trim()}”` : `${total} ${noun}`;
  }

  return (
    <div className="container admin-page">
      <div className="admin-page__head">
        <div>
          <p className="eyebrow">Talent pool</p>
          <h1 className="admin-page__title">Candidates</h1>
        </div>
      </div>

      <form className="admin-search" role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="candidate-search" className="visually-hidden">
          Search candidates
        </label>
        <SearchIcon className="admin-search__icon" width={18} height={18} />
        <input
          id="candidate-search"
          className="input admin-search__input"
          type="search"
          placeholder="Search by name, email, role, location or skill"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>

      <p className="admin-summary" aria-live="polite">
        {summary}
      </p>

      {state === 'error' && (
        <div className="admin-state">
          <p className="alert" role="alert">
            <AlertIcon />
            <span>Could not load candidates. Check your connection and try again.</span>
          </p>
          <button type="button" className="button button--secondary" onClick={() => void load(items.length && hasMore ? items.length : 0)}>
            Try again
          </button>
        </div>
      )}

      {state === 'loading' && <p className="admin-state admin-state--muted">Loading candidates…</p>}

      {state !== 'loading' && state !== 'error' && items.length === 0 && (
        <div className="admin-state admin-empty">
          {searching ? (
            <>
              <p className="admin-empty__title">No candidates match your search</p>
              <p>Try fewer words, or search for a skill, role or city.</p>
            </>
          ) : (
            <>
              <p className="admin-empty__title">No candidates yet</p>
              <p>Profiles submitted on the public site will appear here.</p>
            </>
          )}
        </div>
      )}

      {state !== 'loading' && items.length > 0 && (
        <div className="candidate-list">
          <div className="candidate-list__head" aria-hidden="true">
            <span>Candidate</span>
            <span>Desired role</span>
            <span>Skills</span>
            <span>Work</span>
            <span>Status</span>
          </div>
          <ul aria-label="Candidates">
            {items.map((candidate) => (
              <CandidateRow key={candidate.id} candidate={candidate} />
            ))}
          </ul>
        </div>
      )}

      {hasMore && state !== 'loading' && state !== 'error' && (
        <div className="admin-more">
          <button
            type="button"
            className="button button--secondary"
            disabled={state === 'loading-more'}
            onClick={() => void load(items.length)}
          >
            {state === 'loading-more' ? 'Loading…' : `Show more (${total - items.length} left)`}
          </button>
        </div>
      )}
    </div>
  );
}
