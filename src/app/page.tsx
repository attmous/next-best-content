const endpoints = [
  {
    method: "POST",
    path: "/api/analyze",
    purpose: "Turn authorized audience input into three cited opportunities.",
  },
  {
    method: "POST",
    path: "/api/generate",
    purpose: "Create a six-scene Short or six-slide carousel pack.",
  },
  {
    method: "POST",
    path: "/api/preflight",
    purpose: "Return a transparent, typed editorial quality report.",
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-10 sm:px-10 lg:py-16">
        <header className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-lime-300 font-black text-slate-950">
              N
            </span>
            <div>
              <p className="font-semibold tracking-tight">NextBestContent</p>
              <p className="text-xs text-slate-400">by Tripods</p>
            </div>
          </div>
          <span className="rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-lime-200">
            Foundation published
          </span>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-lime-300">
              Hackathon MVP foundation
            </p>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.055em] text-white sm:text-7xl">
              From audience signals to publish-ready content.
            </h1>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 text-sm leading-6 text-slate-300 shadow-2xl shadow-black/20">
            <p>
              This repository is the contract-first base for parallel feature
              work. The routes compile and expose typed{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-lime-200">
                NOT_IMPLEMENTED
              </code>{" "}
              responses until their owners land each pipeline.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {endpoints.map((endpoint) => (
            <article
              key={endpoint.path}
              className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 transition hover:-translate-y-0.5 hover:border-lime-300/30"
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="rounded-full bg-lime-300 px-2.5 py-1 text-xs font-black text-slate-950">
                  {endpoint.method}
                </span>
                <span className="size-2 rounded-full bg-amber-300" />
              </div>
              <h2 className="font-mono text-sm font-semibold text-white">
                {endpoint.path}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                {endpoint.purpose}
              </p>
            </article>
          ))}
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Public MIT foundation · no credentials · no persisted audience data</p>
          <p>Next.js App Router · TypeScript · Zod · Vitest</p>
        </footer>
      </div>
    </main>
  );
}
