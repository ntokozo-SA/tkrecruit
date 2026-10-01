import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AlertIcon } from '../components/Icons';
import { adminSupabase } from './adminClient';
import { checkIsAdmin } from './adminApi';
import { AdminLogin } from './AdminLogin';
import { CandidateList } from './CandidateList';
import { CandidateProfilePage } from './CandidateProfilePage';
import { ADMIN_BASE, Link, useLocation } from './router';
import './admin.css';

const NO_ACCESS_NOTICE = 'This account does not have admin access.';

type Access = { userId: string; status: 'admin' | 'error' };

function useNoIndex() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'tkpool back office';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, []);
}

function AdminHeader({ email }: { email?: string }) {
  return (
    <header className="site-header">
      <div className="container admin-header">
        <Link href={ADMIN_BASE} className="logo" aria-label="Back office home">
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" focusable="false">
            <rect x="1" y="1" width="20" height="20" rx="3" fill="currentColor" />
            <path d="M6 8h10M6 11.5h6M6 15h8" stroke="var(--paper)" strokeWidth="1.8" strokeLinecap="square" />
          </svg>
          <span>tkpool</span>
          <span className="admin-header__tag">Back office</span>
        </Link>
        {email && (
          <div className="admin-header__account">
            <span className="admin-header__email">{email}</span>
            <button type="button" className="button button--secondary button--small" onClick={() => adminSupabase?.auth.signOut()}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function Message({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="container admin-message">
      <h1 className="admin-message__title">{title}</h1>
      <div className="admin-message__body">{children}</div>
    </div>
  );
}

function AdminRoutes() {
  const { pathname, search } = useLocation();
  const relative = pathname.slice(ADMIN_BASE.length).replace(/\/+$/, '');

  if (relative === '') {
    return <CandidateList search={new URLSearchParams(search).get('q') ?? ''} />;
  }

  const candidateId = /^\/candidates\/([^/]+)$/.exec(relative)?.[1];
  if (candidateId) {
    return <CandidateProfilePage key={candidateId} id={candidateId} />;
  }

  return (
    <Message title="Page not found">
      <Link href={ADMIN_BASE} className="text-link">
        Back to candidates
      </Link>
    </Message>
  );
}

export default function AdminApp() {
  useNoIndex();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [access, setAccess] = useState<Access | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!adminSupabase) return;
    adminSupabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = adminSupabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    checkIsAdmin()
      .then((isAdmin) => {
        if (cancelled) return;
        if (isAdmin) {
          setNotice(null);
          setAccess({ userId, status: 'admin' });
        } else {
          setNotice(NO_ACCESS_NOTICE);
          void adminSupabase?.auth.signOut();
        }
      })
      .catch(() => {
        if (!cancelled) setAccess({ userId, status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [userId, retry]);

  let content: ReactNode;
  if (!adminSupabase) {
    content = (
      <Message title="Not connected">
        <p>
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to the <code>.env</code> file, then
          restart the dev server.
        </p>
      </Message>
    );
  } else if (session === undefined || (session && access?.userId !== session.user.id)) {
    content = <p className="container admin-loading">Loading…</p>;
  } else if (!session) {
    content = <AdminLogin notice={notice} />;
  } else if (access?.status === 'error') {
    content = (
      <Message title="Something went wrong">
        <p className="alert" role="alert">
          <AlertIcon />
          <span>Could not check your access. Please try again.</span>
        </p>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => {
            setAccess(null);
            setRetry((value) => value + 1);
          }}
        >
          Try again
        </button>
      </Message>
    );
  } else {
    content = <AdminRoutes />;
  }

  const signedInAsAdmin = Boolean(session && access?.userId === session.user.id && access.status === 'admin');

  return (
    <div className="admin">
      <AdminHeader email={signedInAsAdmin ? session?.user.email : undefined} />
      <main id="main" className="admin-main">
        {content}
      </main>
    </div>
  );
}
