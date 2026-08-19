export const PANEL_CLASS = 'border border-faded-black bg-manila-light dark:border-manila-light dark:bg-faded-black';

// Square black socket that a `te-button` key sits in (TE-style recessed well).
export const TE_SOCKET_CLASS = 'inline-flex shrink-0 bg-black p-px shadow-[0_1px_2px_rgba(0,0,0,0.4)]';

export const ICON_BUTTON_CLASS =
  'te-button inline-flex size-11 shrink-0 cursor-pointer items-center justify-center bg-faded-black text-manila-light transition-colors hover:bg-soot focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-faded-black disabled:cursor-not-allowed disabled:opacity-50 dark:bg-manila-light dark:text-faded-black dark:hover:bg-manila-dark dark:focus-visible:outline-manila-light';

// Text label buttons (loop / mute / pip / remote / fullscreen): word at the top,
// centered, monospace all-caps, uniform square width. Filled = active.
export const TEXT_BUTTON_CLASS =
  'te-button inline-flex h-11 w-11 shrink-0 cursor-pointer items-start justify-center border border-transparent px-0.5 pt-1.5 text-center font-mono text-[10px] font-semibold uppercase leading-none tracking-tight bg-faded-black text-manila-light transition-colors hover:bg-soot focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-faded-black disabled:cursor-not-allowed disabled:opacity-50 dark:bg-manila-light dark:text-faded-black dark:hover:bg-manila-dark dark:focus-visible:outline-manila-light';

// Bright-orange active key (used for the unmuted state).
export const TEXT_BUTTON_ORANGE_CLASS =
  'te-button inline-flex h-11 w-11 shrink-0 cursor-pointer items-start justify-center border border-transparent px-0.5 pt-1.5 text-center font-mono text-[10px] font-semibold uppercase leading-none tracking-tight bg-orange text-manila-light transition-colors hover:bg-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-faded-black disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:outline-manila-light';

export const TEXT_BUTTON_OUTLINE_CLASS =
  'te-button inline-flex h-11 w-11 shrink-0 cursor-pointer items-start justify-center border border-transparent px-0.5 pt-1.5 text-center font-mono text-[10px] font-semibold uppercase leading-none tracking-tight bg-manila-50 text-faded-black transition-colors hover:bg-manila-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-faded-black disabled:cursor-not-allowed disabled:opacity-50 dark:bg-warm-gray dark:text-manila-light dark:hover:bg-soot dark:focus-visible:outline-manila-light';

// Unpressed state for icon toggle buttons (e.g. loop): outlined instead of filled.
export const ICON_BUTTON_OUTLINE_CLASS =
  'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center border border-faded-black text-faded-black transition-colors hover:bg-faded-black hover:text-manila-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-faded-black disabled:cursor-not-allowed disabled:opacity-50 dark:border-manila-light dark:text-manila-light dark:hover:bg-manila-light dark:hover:text-faded-black dark:focus-visible:outline-manila-light';

export const NUMBER_INPUT_CLASS =
  'w-full rounded-xs border border-manila-dark bg-manila-50 px-3 py-2 font-mono text-sm text-faded-black focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-orange dark:border-warm-gray dark:bg-warm-gray dark:text-manila-light dark:placeholder:text-manila-dark';

export const SET_BUTTON_CLASS =
  'shrink-0 cursor-pointer rounded-xs border border-manila-dark px-3 py-2 font-display text-xs uppercase tracking-wide transition-colors hover:bg-faded-black hover:text-manila-light disabled:cursor-not-allowed disabled:opacity-50 dark:border-warm-gray dark:hover:bg-manila-light dark:hover:text-faded-black';

export const SELECT_CLASS =
  'select-chevron w-full cursor-pointer appearance-none rounded-xs border border-manila-dark bg-manila-50 px-3 py-2 pr-9 text-sm text-faded-black transition-colors hover:bg-manila-dark focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-orange disabled:cursor-not-allowed disabled:opacity-50 dark:border-warm-gray dark:bg-warm-gray dark:text-manila-light dark:hover:bg-soot';
