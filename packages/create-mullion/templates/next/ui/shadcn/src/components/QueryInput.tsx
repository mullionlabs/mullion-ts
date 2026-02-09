'use client';

import {useCallback} from 'react';
import type {KeyboardEvent} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  loading?: boolean;
  submitLabel?: string;
}

export function QueryInput({
  value,
  onChange,
  onSubmit,
  label = 'Query',
  placeholder = 'Enter your query...',
  rows = 3,
  loading = false,
  submitLabel = 'Submit',
}: QueryInputProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (value.trim() && !loading && onSubmit) {
          onSubmit();
        }
      }
    },
    [loading, onSubmit, value],
  );

  const handleClick = () => {
    if (value.trim() && !loading && onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="query-input stack-sm">
      {label ? <label className="m-0">{label}</label> : null}
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        onKeyDown={handleKeyDown}
      />
      <div className="flex items-center justify-between gap-md">
        <span className="text-sm text-muted">
          Press <kbd>Cmd</kbd>+<kbd>Enter</kbd> to submit
        </span>
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={loading || !value.trim()}
          onClick={handleClick}
        >
          {loading ? <span className="loading" /> : null}
          {loading ? 'Processing...' : submitLabel}
        </Button>
      </div>
    </div>
  );
}
