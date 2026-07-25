"use client";

/**
 * Lean inline editing controls: styled to read as content until focused,
 * deliberately not a full editor.
 */
export function InlineTextInput({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
}) {
  return (
    <input
      type="text"
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full rounded-lg border border-transparent bg-transparent px-2 py-1 -mx-2 transition-colors hover:border-line focus:border-line-strong focus:bg-surface ${className}`}
    />
  );
}

export function InlineTextArea({
  label,
  value,
  onChange,
  rows = 3,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      aria-label={label}
      value={value}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full resize-y rounded-lg border border-transparent bg-transparent px-2 py-1 -mx-2 transition-colors hover:border-line focus:border-line-strong focus:bg-surface ${className}`}
    />
  );
}
