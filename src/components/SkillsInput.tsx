import { useMemo, useState, type KeyboardEvent } from 'react';
import skillsUrl from '../data/skills.json?url';
import { MAX_SKILLS } from '../lib/profile';
import { findExact, loadSearchIndex, normalize, searchWithAliases, type Aliases, type SearchIndex } from '../lib/search';
import { ComboboxList, comboboxOptionId, type ComboboxOption } from './Combobox';
import { CloseIcon } from './Icons';

const MAX_SKILL_LENGTH = 60;
const MAX_RESULTS = 8;

const ALIASES: Aliases = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  golang: 'go',
  k8s: 'kubernetes',
  postgres: 'postgresql',
  mssql: 'microsoft sql server',
  gcp: 'google cloud',
  nextjs: 'next.js',
  nodejs: 'node.js',
  reactjs: 'react',
  vuejs: 'vue.js',
  dotnet: '.net',
  'c sharp': 'c#',
  sklearn: 'scikit-learn',
  tf: 'terraform',
  rn: 'react native',
  ml: 'machine learning',
  dl: 'deep learning',
  nlp: 'natural language processing',
  oop: 'object-oriented programming',
  dsa: 'data structures and algorithms',
  ddd: 'domain-driven design',
  gha: 'github actions',
};

function cleanSkill(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_SKILL_LENGTH);
}

interface SkillsInputProps {
  id: string;
  value: string[];
  onChange: (skills: string[]) => void;
  onBlur: () => void;
  invalid: boolean;
  describedBy?: string;
}

export function SkillsInput({ id, value, onChange, onBlur, invalid, describedBy }: SkillsInputProps) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const atLimit = value.length >= MAX_SKILLS;
  const listId = `${id}-options`;

  const options = useMemo<ComboboxOption[]>(() => {
    const typed = cleanSkill(draft);
    if (!typed) return [];
    const added = new Set(value.map(normalize));
    const matches = index
      ? searchWithAliases(index, typed, ALIASES, MAX_RESULTS + value.length)
          .filter((skill) => !added.has(normalize(skill)))
          .slice(0, MAX_RESULTS)
      : [];
    const options: ComboboxOption[] = matches.map((skill) => ({ value: skill }));
    const listed = added.has(normalize(typed)) || matches.some((skill) => normalize(skill) === normalize(typed));
    if (!listed) options.push({ value: typed, custom: true });
    return options;
  }, [draft, index, value]);

  const showList = open && draft.trim().length > 0 && !atLimit;

  function ensureLoaded() {
    if (index || loadFailed) return;
    loadSearchIndex(skillsUrl).then(setIndex, () => setLoadFailed(true));
  }

  /** Adds each comma-separated skill, using the listed spelling when one matches ("react" becomes "React"). */
  function addSkills(raw: string) {
    const incoming = raw
      .split(',')
      .map(cleanSkill)
      .filter(Boolean)
      .map((skill) => (index && findExact(index, skill, ALIASES)) || skill);
    setDraft('');
    setActiveIndex(0);
    if (!incoming.length) return;

    const next = [...value];
    for (const skill of incoming) {
      const exists = next.some((existing) => normalize(existing) === normalize(skill));
      if (!exists && next.length < MAX_SKILLS) next.push(skill);
    }
    onChange(next);
  }

  function removeSkill(skill: string) {
    onChange(value.filter((existing) => existing !== skill));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!showList) {
        setOpen(true);
        return;
      }
      if (!options.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => (current + step + options.length) % options.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const highlighted = showList ? options[activeIndex] : undefined;
      addSkills(highlighted ? highlighted.value : draft);
    } else if (event.key === ',') {
      event.preventDefault();
      addSkills(draft);
    } else if (event.key === 'Escape' && showList) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className={`skills${invalid ? ' skills--invalid' : ''}`}>
      {value.length > 0 && (
        <ul className="skills__list" aria-label="Added skills">
          {value.map((skill) => (
            <li key={skill} className="skills__tag">
              <span>{skill}</span>
              <button
                type="button"
                className="skills__remove"
                onClick={() => removeSkill(skill)}
                aria-label={`Remove ${skill}`}
              >
                <CloseIcon width={12} height={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="skills__entry">
        <div className="combobox skills__search">
          <input
            id={id}
            type="text"
            className="input combobox__input"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={showList && options[activeIndex] ? comboboxOptionId(listId, activeIndex) : undefined}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            value={draft}
            placeholder={atLimit ? `Limit of ${MAX_SKILLS} reached` : 'Search skills, e.g. React'}
            disabled={atLimit}
            autoComplete="off"
            spellCheck={false}
            onFocus={ensureLoaded}
            onPointerEnter={ensureLoaded}
            onChange={(event) => {
              const next = event.target.value;
              if (next.includes(',')) {
                addSkills(next);
              } else {
                setDraft(next);
                setOpen(true);
                setActiveIndex(0);
              }
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              setOpen(false);
              addSkills(draft);
              onBlur();
            }}
          />
          <ComboboxList
            id={listId}
            label="Skills"
            show={showList && !loadFailed}
            loading={!index}
            options={options}
            activeIndex={activeIndex}
            onActiveChange={setActiveIndex}
            onSelect={addSkills}
          />
        </div>
        <button
          type="button"
          className="button button--secondary button--small"
          onClick={() => addSkills(draft)}
          disabled={atLimit || !draft.trim()}
        >
          Add
        </button>
      </div>
      <p className="skills__count">
        {value.length} of {MAX_SKILLS}
      </p>
    </div>
  );
}
