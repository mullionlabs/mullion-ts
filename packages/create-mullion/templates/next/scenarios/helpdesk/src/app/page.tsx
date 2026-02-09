'use client';

import {useEffect, useState} from 'react';
import type {AnalyzeResponse} from '@/schemas';
import {Header} from '@/components/Header';
import {QueryInput} from '@/components/QueryInput';
import {ResultCard} from '@/components/ResultCard';

const projectName = '{{PROJECT_NAME}}';

const exampleTickets = [
  {
    label: 'Billing Issue',
    text: `Subject: Unauthorized Charges

I noticed a charge of $49.99 on my account that I never authorized. This is the second time this has happened and I need this resolved immediately.

My account email is user@example.com`,
  },
  {
    label: 'Technical Problem',
    text: `Subject: App crashes on login

The mobile app keeps crashing whenever I try to log in. I've tried uninstalling and reinstalling but the problem persists. This has been going on for 3 days.

Device: iPhone 14 Pro
iOS version: 17.2`,
  },
  {
    label: 'Account Help',
    text: `Subject: Need to update email

Hi, I need to change the email address associated with my account. The old email is no longer accessible.

Current email: old@example.com
New email: new@example.com

Thanks!`,
  },
] as const;

const priorityClasses: Record<string, string> = {
  low: 'badge badge-success',
  medium: 'badge badge-warning',
  high: 'badge badge-error',
  urgent: 'badge badge-error',
};

export default function HelpdeskPage() {
  const [ticketText, setTicketText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse['data'] | null>(null);
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

  const submitTicket = async () => {
    if (!ticketText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticket: ticketText,
        }),
      });

      const payload = (await response.json()) as
        | AnalyzeResponse
        | {message?: string};

      if (!response.ok) {
        throw new Error(
          'message' in payload && payload.message
            ? payload.message
            : 'Processing failed',
        );
      }

      if ('success' in payload && payload.success) {
        setResult(payload.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example: (typeof exampleTickets)[number]) => {
    setTicketText(example.text);
  };

  const getPriorityClass = (priority: string) =>
    priorityClasses[priority] ?? 'badge badge-info';

  const getEscalationClass = (escalated: boolean) =>
    escalated ? 'badge badge-warning' : 'badge badge-success';

  return (
    <main className="helpdesk-page container stack-lg">
      <Header
        title={projectName}
        subtitle="Helpdesk with Scope Isolation"
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
          <h2 className="mb-0">Submit Support Ticket</h2>

          <QueryInput
            value={ticketText}
            onChange={setTicketText}
            label="Ticket Content"
            placeholder="Describe your issue..."
            rows={6}
            loading={loading}
            submitLabel="Submit Ticket"
            onSubmit={submitTicket}
          />

          <div className="stack-sm">
            <label className="m-0">Try an example:</label>
            <div className="cluster">
              {exampleTickets.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleExampleClick(example)}
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ResultCard
          title="Ticket Processed"
          loading={loading}
          error={error}
          show={showResult}
        >
          {result ? (
            <div className="stack-md">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Ticket ID</span>
                <span className="badge badge-info">{result.ticketId}</span>
              </div>

              <div className="grid grid-auto gap-md p-md bg-muted rounded-md">
                <div className="text-center stack-xs">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    Category
                  </span>
                  <span className="badge badge-info">{result.category}</span>
                </div>
                <div className="text-center stack-xs">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    Priority
                  </span>
                  <span className={getPriorityClass(result.priority)}>
                    {result.priority}
                  </span>
                </div>
                <div className="text-center stack-xs">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    Confidence
                  </span>
                  <span className="font-semibold">
                    {(result.customerResponse.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-center stack-xs">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    Escalated
                  </span>
                  <span
                    className={getEscalationClass(
                      result.customerResponse.escalated,
                    )}
                  >
                    {result.customerResponse.escalated ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div className="stack-sm">
                <h4 className="text-xs uppercase tracking-wide text-muted m-0">
                  Summary
                </h4>
                <p className="m-0">{result.summary}</p>
              </div>

              <div className="stack-sm">
                <h4 className="text-xs uppercase tracking-wide text-muted m-0">
                  Customer Response
                </h4>
                <div className="p-md bg-soft rounded-md whitespace-pre-wrap">
                  {result.customerResponse.message}
                </div>

                <div className="stack-sm">
                  <h5 className="text-xs uppercase tracking-wide text-muted m-0">
                    Action Items
                  </h5>
                  <ul className="list-none list-divider">
                    {result.customerResponse.actionItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <p className="text-sm m-0">
                  <strong>Estimated Resolution:</strong>{' '}
                  {result.customerResponse.estimatedResolution}
                </p>
              </div>

              <div className="p-md bg-warning border border-warning rounded-md text-sm">
                <strong>Scope Isolation:</strong> Internal admin notes (risk
                level, compensation suggestions) are automatically excluded from
                the customer response.
              </div>
            </div>
          ) : null}
        </ResultCard>
      </section>
    </main>
  );
}
