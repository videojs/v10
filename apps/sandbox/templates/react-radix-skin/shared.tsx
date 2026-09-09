// SPIKE: pieces both approaches share so the comparison is about the integration seam, not the chrome.

import { useSandbox } from '@app/shared/react/use-sandbox';
import type { ReactNode } from 'react';

export type Approach = 'render' | 'hooks';

export const APPROACHES: readonly { value: Approach; label: string; blurb: string }[] = [
  {
    value: 'render',
    label: 'Video.js components + Radix via render',
    blurb:
      'Keep Video.js components and compounds. Radix has no Button primitive, so buttons render into a Slot-based shadcn-style button; toggle-shaped buttons render into Radix Toggle through the function form of `render`, which exposes Video.js state for `pressed`. Sliders and menus stay Video.js.',
  },
  {
    value: 'hooks',
    label: 'Radix primitives + Video.js hooks',
    blurb:
      'Build the bar from Radix Slider, DropdownMenu, Tooltip, Popover, and Toggle, fed by usePlayer(selector) state, store actions, and the option hooks. Portals point at the player container so fullscreen keeps them.',
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

export const SELECT_CLASS =
  'rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900';

export const BAR_CLASS =
  'absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-10 pb-2 text-white transition-opacity duration-300';
export const BAR_HIDDEN_CLASS = 'opacity-0 pointer-events-none';
export const ROW_CLASS = 'flex items-center gap-1';
/** Radix ships no styles; this is a shadcn/Radix-flavoured ghost icon button. */
export const ICON_BUTTON_CLASS =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 data-[state=open]:bg-white/15 data-[state=on]:bg-white/20 [&_svg]:size-6';
export const POPUP_CLASS =
  'z-50 rounded-lg border border-white/10 bg-neutral-900/95 p-1 text-sm text-white shadow-xl outline-none backdrop-blur data-[state=open]:animate-in data-[state=open]:fade-in-0';
export const MENU_ITEM_CLASS =
  'relative flex cursor-default items-center gap-2 rounded-md py-1.5 pr-3 pl-7 outline-none select-none data-[highlighted]:bg-white/15 data-[disabled]:opacity-50';
export const MENU_LABEL_CLASS = 'px-2 pt-2 pb-1 text-xs font-semibold tracking-wide text-white/60 uppercase';
export const TOOLTIP_CLASS = 'z-50 rounded-md bg-white px-2.5 py-1 text-xs font-medium text-neutral-900 shadow-md';

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';

  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);

  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto aspect-video w-full max-w-[var(--sandbox-player-width,56rem)] overflow-clip rounded-2xl bg-black text-white">
      {children}
    </div>
  );
}

export function useSandboxSource() {
  const { source, mediaProps } = useSandbox();

  return { source, mediaProps };
}
