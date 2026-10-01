import type { ReactNode } from 'react';
import { AlertIcon } from './Icons';

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

export function RequiredMark() {
  return (
    <span className="field__required" aria-hidden="true">
      *
    </span>
  );
}

export function Field({ id, label, required, optional, hint, error, className, children }: FieldProps) {
  return (
    <div className={['field', error ? 'field--invalid' : '', className ?? ''].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={id}>
        <span>
          {label}
          {required && <RequiredMark />}
        </span>
        {optional && <span className="field__optional">Optional</span>}
      </label>
      {hint && (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {children}
      {error && <FieldError id={`${id}-error`} message={error} />}
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p className="field__error" id={id}>
      <AlertIcon />
      <span>{message}</span>
    </p>
  );
}
