import rolesUrl from '../data/roles.json?url';
import { normalize, searchIndex, type SearchIndex } from '../lib/search';
import { Combobox } from './Combobox';

const SENIORITY = ['Intern', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Staff', 'Principal'];

const ALIASES: Record<string, string> = {
  fullstack: 'full stack',
  'front end': 'frontend',
  'back end': 'backend',
  fe: 'frontend',
  be: 'backend',
  ml: 'machine learning',
  sre: 'site reliability',
  sdet: 'software development engineer in test',
  js: 'javascript',
  ts: 'typescript',
  pm: 'product manager',
  dev: 'developer',
  eng: 'engineer',
};

function searchWithAliases(index: SearchIndex, query: string): string[] {
  const expanded = Object.entries(ALIASES).reduce(
    (text, [alias, full]) => text.replace(new RegExp(`(^| )${alias}( |$)`, 'g'), `$1${full}$2`),
    query,
  );
  if (expanded === query) return searchIndex(index, query);
  return [...new Set([...searchIndex(index, query), ...searchIndex(index, expanded)])].slice(0, 8);
}

/** The role list holds base titles only; a leading seniority word is matched separately and put back in front. */
function searchRoles(index: SearchIndex, query: string): string[] {
  const normalized = normalize(query);
  for (const level of SENIORITY) {
    const prefix = `${normalize(level)} `;
    if (normalized.startsWith(prefix)) {
      return searchWithAliases(index, normalized.slice(prefix.length)).map((role) => `${level} ${role}`);
    }
  }
  return searchWithAliases(index, normalized);
}

interface RoleInputProps {
  id: string;
  value: string;
  onChange: (role: string) => void;
  onBlur: () => void;
  invalid: boolean;
  describedBy?: string;
}

export function RoleInput(props: RoleInputProps) {
  return (
    <Combobox
      {...props}
      name="desiredRole"
      placeholder="Search roles, e.g. Senior Frontend Developer"
      listLabel="Roles"
      optionsUrl={rolesUrl}
      search={searchRoles}
      allowCustom
    />
  );
}
