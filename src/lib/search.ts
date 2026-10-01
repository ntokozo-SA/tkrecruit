export interface SearchEntry {
  label: string;
  /** Normalized label with a leading space, so " token" matches the start of any word. */
  text: string;
}

export type SearchIndex = SearchEntry[];

/** Lowercases, strips accents and punctuation so "zurich" finds "Zürich" and "st louis" finds "St. Louis". */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f'’]/g, '')
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
