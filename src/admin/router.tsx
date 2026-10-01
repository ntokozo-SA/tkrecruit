import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';

export const ADMIN_BASE = '/ntokozo';

export function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_BASE || pathname.startsWith(`${ADMIN_BASE}/`);
}

export function candidatePath(id: string): string {
  return `${ADMIN_BASE}/candidates/${id}`;
}

export function candidateListPath(search: string): string {
  const q = search.trim();
  return q ? `${ADMIN_BASE}?${new URLSearchParams({ q })}` : ADMIN_BASE;
}

const LIST_SEARCH_KEY = 'tkpool-admin-search';

export function rememberListSearch(search: string) {
  try {
    sessionStorage.setItem(LIST_SEARCH_KEY, search);
  } catch {
    // Storage can be unavailable (private mode); the back link just loses the search.
  }
}

export function lastCandidateListPath(): string {
  try {
    return candidateListPath(sessionStorage.getItem(LIST_SEARCH_KEY) ?? '');
  } catch {
    return ADMIN_BASE;
  }
}

const LOCATION_EVENT = 'tkpool:navigate';

export function navigate(to: string, { replace = false } = {}) {
  if (replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  window.dispatchEvent(new Event(LOCATION_EVENT));
}

function readLocation() {
  return { pathname: window.location.pathname, search: window.location.search };
}

export function useLocation() {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const sync = () => setLocation(readLocation());
    window.addEventListener('popstate', sync);
    window.addEventListener(LOCATION_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(LOCATION_EVENT, sync);
    };
  }, []);

  return location;
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function Link({ href, onClick, ...props }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target === '_blank'
    ) {
      return;
    }
    event.preventDefault();
    navigate(href);
    window.scrollTo(0, 0);
  }

  return <a href={href} onClick={handleClick} {...props} />;
}
