import { useEffect } from 'react';

export const COOKIE_POLICY_PATH = '/cookies';

export function CookiePolicy() {
  useEffect(() => {
    const previous = document.title;
    document.title = 'Cookie policy | tkpool';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <article className="policy" aria-labelledby="policy-title">
      <div className="container policy__inner">
        <h1 id="policy-title" className="policy__title">
          Cookie policy
        </h1>
        <p className="policy__updated">Last updated 1 October 2026</p>

        <p className="policy__summary">
          tkpool does not use advertising, analytics or tracking cookies, and the public site does not set any cookies at all. That is why
          there is no cookie banner to accept.
        </p>

        <h2>What we store on your device</h2>
        <p>We only store what the site needs to work. None of it is used to track you or shared with advertisers.</p>
        <table>
          <thead>
            <tr>
              <th scope="col">What</th>
              <th scope="col">Why</th>
              <th scope="col">How long</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Site files (offline cache)</td>
              <td>
                tkpool can be installed as an app. Your browser keeps a copy of the site's code, styles, icons and fonts so it loads quickly
                and opens offline. It contains no personal information.
              </td>
              <td>Until the site is updated or you clear your browser data</td>
            </tr>
            <tr>
              <td>
                <code>tkpool-admin-auth</code>
              </td>
              <td>Staff only. Keeps tkpool staff signed in to the back office. Never set for candidates.</td>
              <td>Until the staff member signs out</td>
            </tr>
            <tr>
              <td>
                <code>tkpool-admin-search</code>
              </td>
              <td>Staff only. Remembers the last candidate search in the back office.</td>
              <td>Until the browser tab is closed</td>
            </tr>
          </tbody>
        </table>

        <h2>Your profile and CV</h2>
        <p>
          The submission form does not save drafts on your device. What you type stays in the page until you submit it. When you submit,
          your profile and CV are sent to our database and private file storage, provided by Supabase. These requests do not set cookies.
        </p>

        <h2>Third parties</h2>
        <ul>
          <li>Fonts are served from our own site, not from Google Fonts or any other font service.</li>
          <li>We do not use analytics tools, social media plugins, embedded videos or advertising networks.</li>
        </ul>

        <h2>Why we don't ask for consent</h2>
        <p>
          Everything listed above is strictly necessary for the site to work, so the law does not require a consent banner for it. If we
          ever add analytics or other non-essential cookies, we will update this page and ask for your permission before setting them.
        </p>

        <h2>How to remove stored data</h2>
        <p>
          You can clear everything tkpool has stored by deleting site data for this website in your browser settings. If you installed
          tkpool as an app, uninstalling it removes the offline copy too.
        </p>

        <p>
          <a className="text-link" href="/">
            Back to tkpool
          </a>
        </p>
      </div>
    </article>
  );
}
