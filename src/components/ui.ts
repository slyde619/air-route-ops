/**
 * Shared class strings, so repeated element styling lives in one place.
 * Type sizes reference the scale declared in index.css.
 */

export const panel = 'border border-line bg-surface'

export const panelHeader =
  'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3'

/** Section heading — sentence case, no eyebrow labels. */
export const panelTitle = 'text-body font-semibold text-ink'

export const panelMeta = 'text-micro text-faint'

/** Segmented control used for the reporting window. */
export const segmentGroup = 'inline-flex border border-line'

export const segmentButton =
  'cursor-pointer px-2.5 py-1 text-micro font-medium text-muted transition-colors ' +
  'duration-150 hover:text-ink aria-pressed:bg-brand-deep aria-pressed:text-ink'

/** Small labelled switch used for the comparison toggle. */
export const toggleBase =
  'inline-flex cursor-pointer items-center gap-2 border border-line px-2.5 py-1 text-micro ' +
  'font-medium text-muted transition-colors duration-150 hover:text-ink ' +
  'aria-pressed:border-brand aria-pressed:bg-brand-deep aria-pressed:text-ink'

/** Route list rows in the rail and the mobile collapse. */
export const routeRow =
  'w-full cursor-pointer border-l-2 px-3 py-2 text-left transition-colors duration-150 ' +
  'border-l-transparent hover:bg-raised aria-pressed:border-l-brand aria-pressed:bg-raised'

/** The one bordered control style reused by buttons. */
export const controlButton =
  'cursor-pointer border border-line-bright px-3 py-1.5 text-label font-medium text-ink ' +
  'transition-colors duration-150 hover:border-brand hover:text-brand-strong'