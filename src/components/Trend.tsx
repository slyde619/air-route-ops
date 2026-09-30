import { TrendDown, TrendFlat, TrendUp } from "./icons";
import { formatDeltaPercent, formatDeltaPoints } from "../lib/format";
import type { Delta } from "../lib/mock/types";

/* ---------------------------------------------------------------------------
   Trend indicator.

   Direction is carried by a glyph and a signed number, never by colour alone:
   for on-time performance an increase is good, but for a cost metric it would
   not be, so the colour decision is left to the caller via `tone`. The accent
   colour is only spent when a value has actually moved the wrong way.
   --------------------------------------------------------------------------- */

interface TrendProps {
  delta: Delta;
  /** 'percent' renders +4.2%, 'points' renders +1.8 pts. */
  unit?: "percent" | "points";
  /**
   * 'up-good' (default) treats a rise as positive — the norm for the four
   * headline KPIs here.
   */
  goodDirection?: "up" | "down";
  /** Names the comparison for screen readers, e.g. 'vs previous month'. */
  against: string;
}

export function Trend({
  delta,
  unit = "percent",
  goodDirection = "up",
  against,
}: TrendProps) {
  // A delta whose baseline period had no data is not a trend. Showing
  // "+100%" or "0 pts vs previous month" against an empty period would
  // imply a comparison that never happened, so the indicator is omitted.
  if (!delta.baselineAvailable) return null;

  const Glyph =
    delta.direction === "up"
      ? TrendUp
      : delta.direction === "down"
        ? TrendDown
        : TrendFlat;

  const text =
    unit === "points"
      ? formatDeltaPoints(delta.value)
      : formatDeltaPercent(delta.value);

  const isGood =
    delta.direction === "flat" ? null : delta.direction === goodDirection;

  const toneClass =
    isGood === null ? "text-faint" : isGood ? "text-brand" : "text-signal";

  const sentiment =
    isGood === null ? "no change" : isGood ? "improved" : "declined";

  return (
    <span
      className={`inline-flex items-center gap-1 font-data text-micro tabular-nums ${toneClass}`}
    >
      <Glyph className="text-label" />
      <span>{text}</span>
      <span className="sr-only">
        {sentiment}, {against}
      </span>
      <span aria-hidden="true" className="text-faint">
        {against}
      </span>
    </span>
  );
}
