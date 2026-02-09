'use client';

import {useEffect, useState} from 'react';
import type {AccessLevel, QueryResponse} from '@/schemas';
import {Header} from '@/components/Header';
import {QueryInput} from '@/components/QueryInput';
import {ResultCard} from '@/components/ResultCard';

const projectName = '{{PROJECT_NAME}}';

const accessLevels = [
  {value: 'public', label: 'Public', description: 'Product docs, marketing'},
  {
    value: 'internal',
    label: 'Internal',
    description: 'Employee handbooks, roadmaps',
  },
  {
    value: 'confidential',
    label: 'Confidential',
    description: 'Financial data, security',
  },
] as const;

const exampleQueries = [
  {query: 'What features does the product offer?', level: 'public'},
  {query: 'What is our Q4 roadmap?', level: 'internal'},
  {query: 'What were our Q3 financial results?', level: 'confidential'},
] as const;

const accessLevelClasses: Record<AccessLevel, {border: string; badge: string}> =
  {
    public: {border: 'border-success', badge: 'badge badge-success'},
    internal: {border: 'border-warning', badge: 'badge badge-warning'},
    confidential: {border: 'border-error', badge: 'badge badge-error'},
  };

export default function RagPage() {
  const [query, setQuery] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('public');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch('/api/status')
      .then((response) => response.json())
      .then((data) => {
        if (mounted) {
          setIsMockMode(Boolean(data?.mockMode));
        }
      })
      .catch(() => {
        if (mounted) {
          setIsMockMode(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const showResult = loading || Boolean(error) || Boolean(result);

  const getAccessLevelBorderClass = (level: AccessLevel) =>
    accessLevelClasses[level]?.border ?? 'border-info';

  const getAccessLevelBadgeClass = (level: AccessLevel) =>
    accessLevelClasses[level]?.badge ?? 'badge badge-info';

  const submitQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          accessLevel,
        }),
      });

      const payload = (await response.json()) as
        | QueryResponse
        | {message?: string};

      if (!response.ok) {
        throw new Error(
          'message' in payload && payload.message
            ? payload.message
            : 'Query failed',
        );
      }

      if ('success' in payload && payload.success) {
        setResult(payload.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example: (typeof exampleQueries)[number]) => {
    setQuery(example.query);
    setAccessLevel(example.level);
  };

  return (
    <main className="rag-page container stack-lg">
      <Header
        title={projectName}
        subtitle="RAG Pipeline with Access Control"
        badge="Powered by Mullion"
      />

      {isMockMode ? (
        <div className="flex items-start gap-md p-md bg-info border border-info rounded-lg">
          <span
            className="font-semibold text-info"
            aria-hidden="true"
          >
            i
          </span>
          <div className="stack-xs">
            <strong className="text-info">Mock Mode Active</strong>
            <p className="text-sm text-info m-0">
              Running with simulated responses. Add API keys to{' '}
              <code>.env</code> for real LLM calls.
            </p>
          </div>
        </div>
      ) : null}

      <section className="stack-lg">
        <div className="card stack-md">
          <h2 className="mb-0">Query Knowledge Base</h2>

          <div className="stack-sm">
            <label className="m-0">Your Access Level</label>
            <div className="grid grid-auto gap-sm">
              {accessLevels.map((level) => (
                <label
                  key={level.value}
                  className={
                    accessLevel === level.value
                      ? `stack-xs p-sm border rounded-md bg-soft ${getAccessLevelBorderClass(
                          level.value,
                        )}`
                      : 'stack-xs p-sm border rounded-md bg-card'
                  }
                >
                  <input
                    type="radio"
                    value={level.value}
                    name="access-level"
                    className="sr-only"
                    checked={accessLevel === level.value}
                    onChange={() => setAccessLevel(level.value)}
                  />
                  <span className="font-semibold">{level.label}</span>
                  <span className="text-sm text-muted">
                    {level.description}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <QueryInput
            value={query}
            onChange={setQuery}
            label="Your Question"
            placeholder="Ask a question about the knowledge base..."
            rows={3}
            loading={loading}
            submitLabel="Submit Query"
            onSubmit={submitQuery}
          />

          <div className="stack-sm">
            <label className="m-0">Try an example:</label>
            <div className="cluster">
              {exampleQueries.map((example) => (
                <button
                  key={example.query}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleExampleClick(example)}
                >
                  <span>{example.query.substring(0, 30)}...</span>
                  <span className={getAccessLevelBadgeClass(example.level)}>
                    {example.level}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <ResultCard
          title="Answer"
          loading={loading}
          error={error}
          show={showResult}
        >
          {result ? (
            <div className="stack-md">
              <p className="m-0">{result.answer}</p>

              <div className="grid grid-auto gap-md p-md bg-muted rounded-md">
                <div className="text-center stack-xs">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    Confidence
                  </span>
                  <span className="font-semibold">
                    {(result.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-center stack-xs">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    Access Level
                  </span>
                  <span
                    className={getAccessLevelBadgeClass(result.accessLevel)}
                  >
                    {result.accessLevel}
                  </span>
                </div>
                <div className="text-center stack-xs">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    Documents Used
                  </span>
                  <span className="font-semibold">
                    {result.metrics.documentsUsed}
                  </span>
                </div>
                <div className="text-center stack-xs">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    Time
                  </span>
                  <span className="font-semibold">
                    {result.metrics.executionTimeMs}ms
                  </span>
                </div>
              </div>

              {result.sources.length > 0 ? (
                <div className="stack-sm">
                  <h4 className="text-xs uppercase tracking-wide text-muted m-0">
                    Sources
                  </h4>
                  <ul className="list-none list-divider">
                    {result.sources.map((source) => (
                      <li
                        key={source.documentId}
                        className="flex items-center justify-between gap-sm"
                      >
                        <span>{source.title}</span>
                        <span
                          className={getAccessLevelBadgeClass(
                            source.accessLevel,
                          )}
                        >
                          {source.accessLevel}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </ResultCard>
      </section>
    </main>
  );
}
