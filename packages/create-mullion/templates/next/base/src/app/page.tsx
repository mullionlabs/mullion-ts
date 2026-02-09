export default function HomePage() {
  return (
    <main className="container stack-lg">
      <header className="stack-sm text-center">
        <h1 className="m-0">{{PROJECT_NAME}}</h1>
        <p className="text-muted m-0">Mullion + Next.js starter</p>
        <span className="badge badge-info">Powered by Mullion</span>
      </header>

      <section className="stack-md">
        <div className="card bg-muted stack-md">
          <h2 className="mb-0">Ready to build</h2>
          <p className="text-muted m-0">
            Choose a scenario (RAG or Helpdesk) when generating the project to
            see the full demo UI and API routes.
          </p>
        </div>
      </section>
    </main>
  );
}
