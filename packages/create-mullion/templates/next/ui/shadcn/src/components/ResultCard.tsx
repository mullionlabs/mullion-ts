'use client';

import type {ReactNode} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

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
    <Card className={error ? 'border-red-300' : undefined}>
      {title ? (
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {loading ? <span className="loading" /> : null}
        </CardHeader>
      ) : null}
      <CardContent className="stack-sm">
        {error ? (
          <div className="text-error">
            <strong>Error:</strong> {error}
          </div>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}
