// SPIKE: pieces both approaches share so the comparison is about the integration seam, not the chrome.

export type Approach = 'render' | 'hooks';

export const APPROACHES: readonly { value: Approach; label: string; blurb: string }[] = [
  {
    value: 'render',
    label: 'Video.js components + Base UI via render',
    blurb:
      'Video.js components and compounds keep behaviour, state, and accessibility; Base UI elements go in through `render`. Buttons swap cleanly; sliders, menus, popovers, dialogs, and indicators stay Video.js and take Base UI-style classes.',
  },
  {
    value: 'hooks',
    label: 'Base UI components + Video.js hooks',
    blurb:
      'Base UI Button, Toggle, Slider, Menu, Popover, Tooltip, and AlertDialog fed by usePlayer(selector) state, store actions, availability flags, and the option hooks. Portals point at the player container so fullscreen keeps them.',
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

export const BAR_CLASS =
  'absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-10 pb-2 text-white transition-opacity duration-300';
export const BAR_HIDDEN_CLASS = 'opacity-0 pointer-events-none';
export const ROW_CLASS = 'flex items-center gap-1';
/** Base UI ghost icon button on a dark surface. */
export const ICON_BUTTON_CLASS = 'text-white hover:bg-white/15 hover:text-white [&_svg]:size-6';
export const POPUP_CLASS =
  'rounded-lg border border-white/10 bg-neutral-900/95 p-1 text-sm text-white shadow-xl outline-none backdrop-blur';
export const MENU_ITEM_CLASS =
  'relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-3 pl-7 outline-none select-none data-[highlighted]:bg-white/15 data-[disabled]:opacity-50';
export const MENU_LABEL_CLASS = 'px-2 pt-2 pb-1 text-xs font-semibold tracking-wide text-white/60 uppercase';
export const TOOLTIP_CLASS = 'rounded-md bg-white px-2.5 py-1 text-xs font-medium text-neutral-900 shadow-md';
export const OVERLAY_CLASS = 'pointer-events-none absolute inset-0 flex items-center justify-center';
export const INDICATOR_CLASS =
  'rounded-full bg-black/60 p-4 text-white opacity-0 transition-opacity duration-200 data-[open]:opacity-100 [&_svg]:size-10';
export const DIALOG_CLASS =
  'absolute inset-0 m-auto flex h-fit max-w-sm flex-col gap-3 rounded-xl border border-white/10 bg-neutral-900 p-5 text-white shadow-2xl outline-none';

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';

  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);

  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}
