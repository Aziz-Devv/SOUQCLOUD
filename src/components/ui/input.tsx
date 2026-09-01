import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, helperText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5 text-right">
        {label ? (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          className={twMerge(
            clsx(
              'w-full h-10 px-3 py-2 text-sm bg-surface border rounded-sm transition-colors',
              'text-text-primary placeholder:text-text-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
              error
                ? 'border-feedback-danger focus-visible:ring-feedback-danger'
                : 'border-border-subtle focus-visible:ring-brand-primary',
              className
            )
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-feedback-danger">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-text-secondary">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
