import { useState, type KeyboardEvent } from 'react';
import { MAX_SKILLS } from '../lib/profile';
import { CloseIcon } from './Icons';

const SUGGESTIONS = [
  'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Node.js',
  'Python', 'Django', 'FastAPI', 'Java', 'Spring', 'Kotlin', 'Swift', 'C#', '.NET', 'Go',
  'Rust', 'PHP', 'Laravel', 'Ruby on Rails', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB',
  'Redis', 'GraphQL', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
  'CI/CD', 'React Native', 'Flutter', 'HTML', 'CSS', 'Tailwind CSS', 'Testing',
];

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
  const atLimit = value.length >= MAX_SKILLS;

  function addSkills(raw: string) {
    const incoming = raw
      .split(',')
      .map((skill) => skill.trim().replace(/\s+/g, ' ').slice(0, 60))
      .filter(Boolean);
    if (!incoming.length) return;

    const next = [...value];
    for (const skill of incoming) {
      const exists = next.some((existing) => existing.toLowerCase() === skill.toLowerCase());
      if (!exists && next.length < MAX_SKILLS) next.push(skill);
    }
    onChange(next);
    setDraft('');
  }

  function removeSkill(skill: string) {
    onChange(value.filter((existing) => existing !== skill));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addSkills(draft);
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
        <input
          id={id}
          type="text"
          className="input"
          value={draft}
          list={`${id}-suggestions`}
          placeholder={atLimit ? `Limit of ${MAX_SKILLS} reached` : 'Type a skill and press Enter'}
          disabled={atLimit}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            const next = event.target.value;
            if (next.includes(',')) addSkills(next);
            else setDraft(next);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            addSkills(draft);
            onBlur();
          }}
        />
        <button
          type="button"
          className="button button--secondary button--small"
          onClick={() => addSkills(draft)}
          disabled={atLimit || !draft.trim()}
        >
          Add
        </button>
      </div>
      <datalist id={`${id}-suggestions`}>
        {SUGGESTIONS.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <p className="skills__count">
        {value.length} of {MAX_SKILLS}
      </p>
    </div>
  );
}
