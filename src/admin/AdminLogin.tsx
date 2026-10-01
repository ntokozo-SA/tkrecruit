import { useState, type FormEvent } from 'react';
import { Field } from '../components/Field';
import { AlertIcon } from '../components/Icons';
import { adminSupabase } from './adminClient';

interface AdminLoginProps {
  notice?: string | null;
}

export function AdminLogin({ notice }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adminSupabase) return;
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await adminSupabase.auth.signInWithPassword({ email: email.trim(), password });

    setSubmitting(false);
    if (signInError) {
      setError(
        signInError.status === 400
          ? 'That email and password combination is not correct.'
          : 'Could not sign in right now. Please try again in a moment.',
      );
    }
  }

  const message = error ?? notice;

  return (
    <div className="admin-login">
      <form className="admin-login__card" onSubmit={handleSubmit} noValidate>
        <p className="eyebrow">Back office</p>
        <h1 className="admin-login__title">Sign in</h1>
        <p className="admin-login__lead">Only platform admins can access this area.</p>

        <div className="admin-login__fields">
          <Field id="admin-email" label="Email">
            <input
              id="admin-email"
              className="input"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field id="admin-password" label="Password">
            <input
              id="admin-password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
        </div>

        {message && (
          <p className="alert" role="alert">
            <AlertIcon />
            <span>{message}</span>
          </p>
        )}

        <button
          type="submit"
          className="button button--primary button--large admin-login__submit"
          disabled={submitting || !email.trim() || !password}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
