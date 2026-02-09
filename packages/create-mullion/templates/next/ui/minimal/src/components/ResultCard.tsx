'use client';

import type {ReactNode} from 'react';

interface ResultCardProps {
  title?: string;
  loading?: boolean;
  error?: string | null;
  show?: boolean;
  children?: ReactNode;
}

export function ResultCard({
  title,
  loading = false,
  error,
  show = true,
  children,
}: ResultCardProps) {
  if (!show) return null;

  return (
    <div className={`result-card card ${error ? 'border-error' : ''}`.trim()}>
      {title ? (
        <div className="card-header flex items-center justify-between">
          <h3 className="card-title text-base">{title}</h3>
          {loading ? <span className="loading" /> : null}
        </div>
      ) : null}

      <div className="card-body">
        {error ? (
          <div className="text-error">
            <strong>Error:</strong> {error}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
