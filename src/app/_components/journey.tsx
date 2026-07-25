import { JOURNEY_ICONS } from "@/app/_components/icons";

export type JourneyStep = "listen" | "decide" | "create" | "preflight";

export const JOURNEY_STEPS: Array<{
  id: JourneyStep;
  title: string;
  description: string;
}> = [
  {
    id: "listen",
    title: "Listen",
    description: "Read what your audience is already saying",
  },
  {
    id: "decide",
    title: "Decide",
    description: "Three evidence-backed opportunities, scored",
  },
  {
    id: "create",
    title: "Create",
    description: "A six-scene Short or carousel, drafted",
  },
  {
    id: "preflight",
    title: "Preflight",
    description: "Seven checks before you publish",
  },
];

/** Explainer variant used on the start screen. */
export function JourneyExplainer() {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {JOURNEY_STEPS.map((step, index) => {
        const Icon = JOURNEY_ICONS[step.id];
        return (
          <li
            key={step.id}
            className="rounded-2xl border border-line bg-surface p-5"
          >
            <div className="flex items-center justify-between">
              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-xl bg-surface-raised text-signal"
              >
                <Icon className="size-4.5" />
              </span>
              <p className="font-display text-sm text-ink-faint">
                0{index + 1}
              </p>
            </div>
            <p className="mt-3 font-semibold text-ink">{step.title}</p>
            <p className="mt-1 text-sm leading-5 text-ink-soft">
              {step.description}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/** Compact progress variant shown in the header once a run is underway. */
export function JourneyProgress({ current }: { current: JourneyStep }) {
  const currentIndex = JOURNEY_STEPS.findIndex((step) => step.id === current);

  return (
    <ol aria-label="Journey progress" className="flex items-center gap-1.5">
      {JOURNEY_STEPS.map((step, index) => {
        const state =
          index < currentIndex
            ? "done"
            : index === currentIndex
              ? "current"
              : "upcoming";
        return (
          <li key={step.id} className="flex items-center gap-1.5">
            {index > 0 && (
              <span
                aria-hidden="true"
                className={`hidden h-px w-4 sm:block ${state === "upcoming" ? "bg-line" : "bg-signal/50"}`}
              />
            )}
            <span
              aria-current={state === "current" ? "step" : undefined}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                state === "current"
                  ? "bg-signal text-signal-ink"
                  : state === "done"
                    ? "text-signal"
                    : "text-ink-faint"
              }`}
            >
              {state === "done" ? (
                <span aria-hidden="true" className="mr-1">
                  ✓
                </span>
              ) : null}
              {step.title}
              {state === "done" && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
