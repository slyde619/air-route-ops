import type { ReactNode } from "react";

/* ---------------------------------------------------------------------------
   Loading and empty states.

   Copy is written in the plain voice an operations tool would use: it states
   what is happening or what is missing and what the reader can do about it.
   No apologies, no exclamation marks.
   --------------------------------------------------------------------------- */

interface PanelStateProps {
  children: ReactNode;
  /** Reserves chart-height space so the layout does not jump on load. */
  minHeightClass?: string;
}

function PanelState({
  children,
  minHeightClass = "min-h-24",
}: PanelStateProps) {
  return (
    <div
      className={`flex items-center justify-center px-4 py-6 ${minHeightClass}`}
    >
      <p className="text-center text-label text-faint">{children}</p>
    </div>
  );
}

/** Skeleton bars sized like the content that is about to replace them. */
export function PanelLoading({
  label,
  rows = 4,
  minHeightClass,
}: {
  label: string;
  rows?: number;
  minHeightClass?: string;
}) {
  return (
    <div
      className={`flex flex-col justify-center gap-2 px-4 py-5 ${minHeightClass ?? ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <span
          key={i}
          className="block h-3 bg-raised motion-safe:animate-pulse"
          style={{ width: `${[92, 76, 84, 61, 70][i % 5]}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function PanelEmpty({
  children,
  minHeightClass,
}: {
  children: ReactNode;
  minHeightClass?: string;
}) {
  return <PanelState minHeightClass={minHeightClass}>{children}</PanelState>;
}

export function PanelError({
  children,
  minHeightClass,
}: {
  children: ReactNode;
  minHeightClass?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center ${minHeightClass ?? "min-h-24"}`}
    >
      <p className="px-4 py-6 text-center text-label text-signal">{children}</p>
    </div>
  );
}

/** Full-page failure state for when no dataset is available at all. */
export function PageError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center px-6">
      <div className="max-w-sm border border-line bg-surface px-5 py-5">
        <h1 className="text-lead font-semibold text-ink">
          The dashboard could not load its data
        </h1>
        <p className="mt-2 text-label text-muted">
          {message} Nothing can be shown until the data loads.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 border border-line-bright px-3 py-1.5 text-label font-medium text-ink transition-colors duration-150 hover:border-brand hover:text-brand-strong"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
