export interface SearchEntry {
  label: string;
  /** Normalized label with a leading space, so " token" matches the start of any word. */
  text: string;
}

export type SearchIndex = SearchEntry[];

/** Normalized shorthand mapped to what it stands for, e.g. { k8s: 'kubernetes' }. */
export type Aliases = Record<string, string>;

/**
 * Lowercases, strips accents and punctuation so "zurich" finds "Zürich" and "st louis" finds "St. Louis".
 * "#" and "++" are kept as letters so C, C# and C++ stay distinct.
 */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f'’]/g, '')
    .replace(/\+\+/g, 'pp')
    .replace(/#/g, 'sharp')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const loaded = new Map<string, Promise<SearchIndex>>();

/** Fetches a JSON array of labels once per URL and prepares it for searching. */
export function loadSearchIndex(url: string): Promise<SearchIndex> {
  let promise = loaded.get(url);
  if (!promise) {
    promise = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
        return response.json() as Promise<string[]>;
      })
      .then((labels) => labels.map((label) => ({ label, text: ` ${normalize(label)}` })))
      .catch((error: unknown) => {
        loaded.delete(url);
        throw error;
      });
    loaded.set(url, promise);
  }
  return promise;
}

/**
 * Every typed word must start a word in the label. Exact matches rank first, then labels starting with
 * the query, then the rest; within each group the index order is kept, so pre-sort it by popularity.
 */
export function searchIndex(index: SearchIndex, query: string, limit = 8): string[] {
  const normalized = normalize(query);
  if (!normalized) return [];
  const tokens = normalized.split(' ').map((token) => ` ${token}`);
  const leading = ` ${normalized}`;

  const exact: string[] = [];
  const starts: string[] = [];
  const others: string[] = [];
  for (const { label, text } of index) {
    if (starts.length >= limit) break;
    if (!tokens.every((token) => text.includes(token))) continue;
    if (text === leading) exact.push(label);
    else if (text.startsWith(leading)) starts.push(label);
    else if (others.length < limit) others.push(label);
  }
  return [...exact, ...starts, ...others].slice(0, limit);
}

export function expandAliases(query: string, aliases: Aliases): string {
  return Object.entries(aliases).reduce(
    (text, [alias, full]) => text.replace(new RegExp(`(^| )${alias}( |$)`, 'g'), `$1${normalize(full)}$2`),
    normalize(query),
  );
}

/** Searches the query as typed and with shorthand expanded; expanded matches come first. */
export function searchWithAliases(index: SearchIndex, query: string, aliases: Aliases, limit = 8): string[] {
  const expanded = expandAliases(query, aliases);
  if (expanded === normalize(query)) return searchIndex(index, query, limit);
  return [...new Set([...searchIndex(index, expanded, limit), ...searchIndex(index, query, limit)])].slice(0, limit);
}

/** The listed label that matches the query exactly, ignoring case, accents and punctuation. */
export function findExact(index: SearchIndex, query: string, aliases: Aliases = {}): string | undefined {
  const candidates = new Set([` ${normalize(query)}`, ` ${expandAliases(query, aliases)}`]);
  return index.find((entry) => candidates.has(entry.text))?.label;
}
