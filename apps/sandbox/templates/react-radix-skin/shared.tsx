// SPIKE: pieces both approaches share so the comparison is about the integration seam, not the chrome. The classes
// reproduce the default video skin's metrics: a 44px pill bar inset 12px, 36px round buttons with 18px icons, 13px
// tabular time, a 4px track with a 12px thumb, and a bottom gradient behind the bar.

export type Approach = 'render' | 'hooks';

export const APPROACHES: readonly { value: Approach; label: string; blurb: string }[] = [
  {
    value: 'render',
    label: 'Video.js components + Radix via render',
    blurb:
      'Video.js components and compounds keep behaviour, state, and accessibility. Radix has no Button primitive, so buttons render into a Slot-based button; toggle-shaped buttons render into Radix Toggle through the function form of `render`, which exposes Video.js state for `pressed`. Sliders, menus, dialogs, and indicators stay Video.js.',
  },
  {
    value: 'hooks',
    label: 'Radix primitives + Video.js hooks',
    blurb:
      'Radix Slider, DropdownMenu with submenus, Tooltip, Popover, Toggle, a player-scoped Dialog, and Radix Icons, fed by usePlayer(selector) state, store actions, availability flags, the option hooks, and useTranslator() for every label. The seek slider derives hover time, chapter title, and storyboard thumbnails from the text-track feature.',
  },
];

export function readApproach(): Approach {
  const value = new URLSearchParams(window.location.search).get('approach');

  return value === 'hooks' ? 'hooks' : 'render';
}

export function writeApproach(approach: Approach) {
  const url = new URL(window.location.href);

  url.searchParams.set('approach', approach);
  window.history.replaceState(null, '', url);
}

/** The default skin's controls gradient, painted over the whole container behind the bar. */
export const BACKDROP_CLASS =
  'pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-black/30 via-25% to-transparent transition-opacity duration-300';
/** The default skin's pill bar. */
export const BAR_CLASS =
  'absolute inset-x-3 bottom-3 flex h-11 items-center rounded-full bg-white/10 p-1 text-white backdrop-blur-[16px] backdrop-saturate-150 transition-opacity duration-300';
export const BAR_HIDDEN_CLASS = 'opacity-0 pointer-events-none';
/** Current time, slider, remaining time. */
export const TIME_GROUP_CLASS = 'flex grow items-center gap-2.5 px-3';
export const SECONDARY_GROUP_CLASS = 'flex items-center gap-px';
export const ROW_CLASS = 'flex items-center gap-1';
export const INDICATOR_CLASS =
  'rounded-full bg-black/60 p-4 text-white opacity-0 transition-opacity duration-200 data-[open]:opacity-100 [&_svg]:size-10';
export const TIME_CLASS = 'text-[13px] tabular-nums';
/** A 36px round icon button; Radix ships no styles. */
export const ICON_BUTTON_CLASS =
  'inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-[state=open]:bg-white/15 [&_svg]:size-[18px]';
export const TEXT_BUTTON_CLASS =
  'inline-flex h-8 cursor-pointer items-center rounded-full bg-white/15 px-3 text-sm font-medium text-white outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/60';
export const POPUP_CLASS =
  'z-50 rounded-xl border border-white/10 bg-neutral-900/90 p-1 text-[13px] text-white shadow-xl outline-none backdrop-blur-[16px] backdrop-saturate-150';
export const MENU_ITEM_CLASS =
  'relative flex cursor-pointer items-center gap-2 rounded-lg py-2 pr-3 pl-8 outline-none select-none data-[highlighted]:bg-white/15 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50';
export const MENU_TRIGGER_ITEM_CLASS =
  'relative flex cursor-pointer items-center gap-2 rounded-lg py-2 pr-2 pl-3 outline-none select-none data-[highlighted]:bg-white/15 data-[state=open]:bg-white/15';
export const MENU_LABEL_CLASS = 'px-2 pt-2 pb-1 text-xs font-semibold tracking-wide text-white/60 uppercase';
export const MENU_HINT_CLASS = 'ml-auto flex items-center gap-1 pl-4 text-white/60';
export const TOOLTIP_CLASS = 'z-50 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-neutral-900 shadow-md';
export const OVERLAY_CLASS = 'pointer-events-none absolute inset-0 flex items-center justify-center';
export const DIALOG_CLASS =
  'absolute inset-0 z-50 m-auto flex h-fit max-w-sm flex-col gap-3 rounded-xl border border-white/10 bg-neutral-900 p-5 text-white shadow-2xl outline-none';

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';

  const total = Math.floor(Math.max(0, seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);

  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}
