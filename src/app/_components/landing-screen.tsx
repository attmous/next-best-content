"use client";

import { DEMO_ASSETS, demoAnalyzeResponse } from "@/app/_demo/fixtures";
import {
  GITHUB_SETUP_URL,
  LANDING_CTA_PRIMARY,
  LANDING_CTA_SECONDARY,
  LANDING_HEADLINE,
  TRUST_POINTS,
} from "@/app/_lib/landing";
import { PLATFORM_LABELS, TARGET_PLATFORMS } from "@/app/_lib/platforms";
import {
  CheckIcon,
  CreateIcon,
  DecideIcon,
  ExternalLinkIcon,
  FlaskIcon,
  HourglassIcon,
  ListenIcon,
  LockIcon,
  PlatformIcon,
  PreflightIcon,
} from "@/app/_components/icons";
import { Button, SectionLabel } from "@/app/_components/ui";

const TRUST_ICONS = [FlaskIcon, CheckIcon, LockIcon, ExternalLinkIcon];

/**
 * Public launch page. Everything shown from the product is real data from
 * the synthetic Maya Makes Space fixture — the primary CTA drops straight
 * into the working demo journey, never a slideshow.
 */
export function LandingScreen({
  onDemo,
  onWorkspace,
}: {
  onDemo: () => void;
  onWorkspace: () => void;
}) {
  const signals = demoAnalyzeResponse.signals;
  const topEvidence = signals[0].evidence[0];

  return (
    <div className="stage-enter relative mx-auto flex w-full max-w-6xl flex-col gap-16 lg:gap-20">
      {/* Landing-only glow backdrop, echoing the launch mockup */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 h-[36rem]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 8%, rgb(201 242 79 / 0.12), transparent 30rem), radial-gradient(circle at 90% 30%, rgb(126 200 227 / 0.08), transparent 28rem)",
        }}
      />

      {/* Hero */}
      <section className="relative mt-2 grid gap-10 lg:mt-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
        <div>
          <SectionLabel>Audience intelligence for creators</SectionLabel>
          <h1
            id="stage-heading"
            tabIndex={-1}
            className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-ink outline-none sm:text-7xl"
          >
            {LANDING_HEADLINE}
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button onClick={onDemo} className="px-7 py-3.5 text-base">
              {LANDING_CTA_PRIMARY}
            </Button>
            <a
              href={GITHUB_SETUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-line-strong px-5 py-3 text-sm text-ink transition-colors hover:bg-surface-raised"
            >
              <ExternalLinkIcon className="size-4" />
              {LANDING_CTA_SECONDARY}
            </a>
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Synthetic data · no account · nothing gets published
          </p>
        </div>
        <div className="rounded-3xl border border-line bg-surface/70 p-6 text-sm leading-6 text-ink-soft shadow-2xl shadow-black/20">
          <p>
            NextBestContent reads the comments under a video, finds the three
            signals the audience keeps repeating, and turns the one you choose
            into a six-scene YouTube Short or a LinkedIn document post — then
            runs seven transparent checks before anything leaves the studio.
          </p>
          <p className="mt-3 text-xs text-ink-faint">
            Every recommendation carries the actual comments behind it.
          </p>
        </div>
      </section>

      {/* Journey preview, from the real synthetic fixture */}
      <section aria-label="Product preview" className="relative">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-ink">
            The whole journey, previewed
          </h2>
          <p className="text-xs text-ink-faint">
            From the synthetic “Maya Makes Space” demo — fictional creator,
            fictional comments, original artwork
          </p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <PreviewCard
            icon={<ListenIcon className="size-4" />}
            step="Listen"
            image={DEMO_ASSETS.balconyBefore}
          >
            <blockquote className="text-xs leading-5 text-ink">
              “{topEvidence.text.slice(0, 88)}…”
            </blockquote>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              {topEvidence.author} · {topEvidence.likeCount} likes ·{" "}
              {signals[0].evidenceCount} supporting comments
            </p>
          </PreviewCard>
          <PreviewCard
            icon={<DecideIcon className="size-4" />}
            step="Decide"
            image={DEMO_ASSETS.planters}
          >
            <p className="text-xs font-semibold text-ink">{signals[0].title}</p>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              Opportunity score{" "}
              <span className="font-display text-sm font-bold text-signal">
                {signals[0].opportunityScore}
              </span>{" "}
              / 100 · one of exactly three signals
            </p>
          </PreviewCard>
          <PreviewCard
            icon={<CreateIcon className="size-4" />}
            step="Create"
            image={DEMO_ASSETS.watering}
          >
            <p className="text-xs font-semibold text-ink">
              “{signals[1].recommendation.workingTitle}”
            </p>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              Six scenes · YouTube Short or LinkedIn document — source and
              destination are independent
            </p>
          </PreviewCard>
          <PreviewCard
            icon={<PreflightIcon className="size-4" />}
            step="Preflight & export"
            image={DEMO_ASSETS.lesson}
          >
            <p className="text-xs font-semibold text-ink">
              Seven transparent checks
            </p>
            <p className="mt-1.5 text-[11px] text-ink-faint">
              Then copy, storyboard, PNG, and PDF exports — nothing is
              published automatically
            </p>
          </PreviewCard>
        </div>
      </section>

      {/* Platforms, straight from the registry */}
      <section aria-label="Supported platforms" className="relative">
        <h2 className="font-display text-xl font-bold text-ink">
          Where your content can land
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TARGET_PLATFORMS.map((entry) => (
            <article
              key={entry.platform}
              aria-label={PLATFORM_LABELS[entry.platform]}
              className={`rounded-2xl border p-5 ${
                entry.availability === "coming_soon"
                  ? "border-dashed border-line"
                  : "border-line bg-surface"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={`grid size-9 place-items-center rounded-xl ${
                    entry.availability === "coming_soon"
                      ? "bg-surface text-ink-faint"
                      : "bg-surface-raised text-ink"
                  }`}
                >
                  <PlatformIcon platform={entry.platform} className="size-4.5" />
                </span>
                <h3 className="font-semibold text-ink">
                  {PLATFORM_LABELS[entry.platform]}
                </h3>
              </div>
              {entry.availability === "coming_soon" ? (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-faint">
                  <HourglassIcon className="size-3.5" />
                  Coming soon — nothing drafted or published yet
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-1.5 text-xs text-ink-soft">
                  {entry.outputs.map((output) => (
                    <li key={output.id} className="flex items-center gap-1.5">
                      {output.availability === "available" ? (
                        <CheckIcon className="size-3.5 text-signal" />
                      ) : (
                        <LockIcon className="size-3.5 text-ink-faint" />
                      )}
                      {output.title}
                      {output.availability !== "available" && " — planned"}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-ink-faint">
          Sources: live YouTube comments and creator imports (self-hosted) ·
          the synthetic demo right here.{" "}
          <button
            type="button"
            onClick={onWorkspace}
            className="font-medium text-signal underline-offset-4 hover:underline"
          >
            Browse the full workspace →
          </button>
        </p>
      </section>

      {/* Trust */}
      <section
        aria-label="Privacy and trust"
        className="relative rounded-3xl border border-line bg-surface p-7"
      >
        <h2 className="font-display text-xl font-bold text-ink">
          Built to be trusted with an audience
        </h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_POINTS.map((point, index) => {
            const Icon = TRUST_ICONS[index];
            return (
              <div key={point.title}>
                <dt className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <span
                    aria-hidden="true"
                    className="grid size-7 place-items-center rounded-lg bg-surface-raised text-signal"
                  >
                    <Icon className="size-3.5" />
                  </span>
                  {point.title}
                </dt>
                <dd className="mt-2 text-xs leading-5 text-ink-soft">
                  {point.detail}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {/* Self-hosted path */}
      <section
        id="self-hosted"
        aria-label="Run privately"
        className="relative mb-4 grid gap-8 rounded-3xl border border-signal/25 bg-surface p-7 lg:grid-cols-[1fr_auto] lg:items-center"
      >
        <div>
          <h2 className="font-display text-xl font-bold text-ink">
            Run it privately with your own key
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            The complete product — live YouTube analysis, comment imports, and
            generation — runs on your machine. Your model key is configured
            through the container environment and never touches the browser.
          </p>
          <ol className="mt-4 flex flex-col gap-1.5 text-sm text-ink-soft">
            <li>
              <span className="font-display text-signal">1 </span> Clone the
              repository and copy the example environment file.
            </li>
            <li>
              <span className="font-display text-signal">2 </span> Set your
              model key and feature gates in the container environment.
            </li>
            <li>
              <span className="font-display text-signal">3 </span> Start it up
              and open your private workspace on localhost.
            </li>
          </ol>
        </div>
        <a
          href={GITHUB_SETUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-6 py-3 text-sm font-semibold text-signal-ink transition-[filter] hover:brightness-105"
        >
          <ExternalLinkIcon className="size-4" />
          Local setup on GitHub
        </a>
      </section>
    </div>
  );
}

function PreviewCard({
  icon,
  step,
  image,
  children,
}: {
  icon: React.ReactNode;
  step: string;
  image: { src: string; alt: string };
  children: React.ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element -- locally shipped synthetic SVG artwork; next/image adds nothing for static vectors */}
      <img
        src={image.src}
        alt={image.alt}
        width={800}
        height={500}
        className="aspect-[8/5] w-full object-cover"
      />
      <div className="p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-signal">
          {icon}
          {step}
        </p>
        <div className="mt-2">{children}</div>
      </div>
    </article>
  );
}
