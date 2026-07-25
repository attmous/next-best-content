import type { SVGProps } from "react";

import type {
  SignalCategory,
} from "@/contracts";
import type {
  PlatformId,
  SourceMode,
  SourcePlatformTag,
} from "@/app/_lib/platforms";

/**
 * Self-contained inline icon set. Two families, both currentColor:
 *
 * - Brand glyphs (filled silhouettes) for platforms — tinted like any other
 *   UI icon so they read as interface, not advertising.
 * - Stroke icons (1.75px, round caps) for concepts, statuses, and actions.
 *
 * Icons are decorative by default (`aria-hidden`) — always pair them with a
 * visible label or pass an explicit aria-label on the wrapping control.
 */

type IconProps = SVGProps<SVGSVGElement>;

function FillIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="size-4 shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

function StrokeIcon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4 shrink-0"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ---------------------------------- Brands --------------------------------- */

export function YoutubeIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <path d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.5 2.5 0 0 0 2.42 7.2C2 8.75 2 12 2 12s0 3.25.42 4.81a2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81ZM10 15V9l5.2 3Z" />
    </FillIcon>
  );
}

export function LinkedinIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0Z" />
    </FillIcon>
  );
}

export function XPlatformIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <path d="M18.9 1.15h3.68l-8.04 9.2L24 22.84h-7.4l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.3 17.4Z" />
    </FillIcon>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.02 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.5h-2.8V24C19.61 23.09 24 18.09 24 12.07Z" />
    </FillIcon>
  );
}

/** Generic globe for user-tagged "Other platform" sources. */
export function GlobeIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18" />
    </StrokeIcon>
  );
}

/* ------------------------------ Source modes ------------------------------- */

export function LiveIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M8.6 8.6a4.8 4.8 0 0 0 0 6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8M5.8 5.8a8.8 8.8 0 0 0 0 12.4M18.2 5.8a8.8 8.8 0 0 1 0 12.4" />
    </StrokeIcon>
  );
}

export function ImportTrayIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
      <path d="M12 4v10M8 10l4 4 4-4" />
    </StrokeIcon>
  );
}

export function FlaskIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M9 3h6M10 3v6l-5.2 8.5A2 2 0 0 0 6.5 20.5h11a2 2 0 0 0 1.7-3L14 9V3" />
      <path d="M7.6 15h8.8" />
    </StrokeIcon>
  );
}

/* --------------------------- Signal categories ----------------------------- */

function bubblePath() {
  return (
    <path d="M12 4a8 8 0 0 1 8 8 8 8 0 0 1-8 8H4.5L6 16.8A8 8 0 0 1 12 4Z" />
  );
}

export function RequestIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      {bubblePath()}
      <path d="M12 9v6M9 12h6" />
    </StrokeIcon>
  );
}

export function QuestionIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      {bubblePath()}
      <path d="M10 10.2a2.1 2.1 0 0 1 4.1.7c0 1.4-2 1.8-2 2.8" />
      <path d="M12 16.4h.01" />
    </StrokeIcon>
  );
}

export function SparkIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M13 2 4.8 13.2h5.7L10 22l8.2-11.2h-5.7L13 2Z" />
    </StrokeIcon>
  );
}

/* ------------------------------ Journey steps ------------------------------ */

export function ListenIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
    </StrokeIcon>
  );
}

export function DecideIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 5v4a4 4 0 0 0 4 4h10M14 8l5 5-5 5" />
    </StrokeIcon>
  );
}

export function CreateIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M17.2 3.3a2.6 2.6 0 0 1 3.6 3.6L7.6 20.1 2 22l1.9-5.6L17.2 3.3Z" />
    </StrokeIcon>
  );
}

export function PreflightIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 14l2 2 4-4.5" />
    </StrokeIcon>
  );
}

/* -------------------------------- Statuses --------------------------------- */

export function CheckIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M5 13l4 4L19 7" />
    </StrokeIcon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 6.5v6.5M12 17.5h.01" />
    </StrokeIcon>
  );
}

export function CrossIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </StrokeIcon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </StrokeIcon>
  );
}

export function HourglassIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M7 3h10M7 21h10M8 3v3.5c0 2 4 3.7 4 5.5s-4 3.5-4 5.5V21M16 3v3.5c0 2-4 3.7-4 5.5s4 3.5 4 5.5V21" />
    </StrokeIcon>
  );
}

/* --------------------------------- Actions --------------------------------- */

export function CopyIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </StrokeIcon>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 3v11M7.5 9.5 12 14l4.5-4.5M5 20h14" />
    </StrokeIcon>
  );
}

export function FileTextIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z" />
      <path d="M14 2v5h5M9 13h6M9 17h6" />
    </StrokeIcon>
  );
}

export function FilePdfIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7l-5-5Z" />
      <path d="M14 2v5h5" />
      <text
        x="12"
        y="17.5"
        textAnchor="middle"
        fontSize="6"
        fontWeight="700"
        fontFamily="inherit"
        fill="currentColor"
        stroke="none"
      >
        PDF
      </text>
    </StrokeIcon>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.8" cy="10" r="1.4" />
      <path d="M21 15.5 16 10.5 6.5 19" />
    </StrokeIcon>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M14 5h5v5M19 5l-8.5 8.5" />
      <path d="M19 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.5" />
    </StrokeIcon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <path d="M8 5.4v13.2L19 12 8 5.4Z" />
    </FillIcon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <FillIcon {...props}>
      <path d="M8 5h3v14H8zM13 5h3v14h-3z" />
    </FillIcon>
  );
}

/* ------------------------------ Keyed lookups ------------------------------ */

const PLATFORM_ICONS: Record<
  PlatformId,
  (props: IconProps) => React.JSX.Element
> = {
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
  x: XPlatformIcon,
  facebook: FacebookIcon,
};

export function PlatformIcon({
  platform,
  ...props
}: IconProps & { platform: SourcePlatformTag }) {
  const Icon = platform === "other" ? GlobeIcon : PLATFORM_ICONS[platform];
  return <Icon {...props} />;
}

const SOURCE_MODE_ICONS: Record<
  SourceMode,
  (props: IconProps) => React.JSX.Element
> = {
  live: LiveIcon,
  import: ImportTrayIcon,
  demo: FlaskIcon,
};

export function SourceModeIcon({
  mode,
  ...props
}: IconProps & { mode: SourceMode }) {
  const Icon = SOURCE_MODE_ICONS[mode];
  return <Icon {...props} />;
}

const CATEGORY_ICONS: Record<
  SignalCategory,
  (props: IconProps) => React.JSX.Element
> = {
  request: RequestIcon,
  unanswered_question: QuestionIcon,
  strong_reaction: SparkIcon,
};

export function CategoryIcon({
  category,
  ...props
}: IconProps & { category: SignalCategory }) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon {...props} />;
}

export const JOURNEY_ICONS = {
  listen: ListenIcon,
  decide: DecideIcon,
  create: CreateIcon,
  preflight: PreflightIcon,
} as const;
