import rolesUrl from '../data/roles.json?url';
import { normalize, searchWithAliases, type Aliases, type SearchIndex } from '../lib/search';
import { Combobox } from './Combobox';

const SENIORITY = ['Intern', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Staff', 'Principal'];

const ALIASES: Aliases = {
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

/** The role list holds base titles only; a leading seniority word is matched separately and put back in front. */
function searchRoles(index: SearchIndex, query: string): string[] {
  const normalized = normalize(query);
  for (const level of SENIORITY) {
    const prefix = `${normalize(level)} `;
    if (normalized.startsWith(prefix)) {
      return searchWithAliases(index, normalized.slice(prefix.length), ALIASES).map((role) => `${level} ${role}`);
    }
  }
  return searchWithAliases(index, normalized, ALIASES);
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
