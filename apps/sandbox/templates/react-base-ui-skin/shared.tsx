// SPIKE: pieces both approaches share so the comparison is about the integration seam, not the chrome.

import { useSandbox } from '@app/shared/react/use-sandbox';
import type { ReactNode } from 'react';

export type Approach = 'render' | 'hooks';

export const APPROACHES: readonly { value: Approach; label: string; blurb: string }[] = [
  {
    value: 'render',
    label: 'Video.js components + Base UI via render',
    blurb:
      'Keep Video.js components and compounds; hand Base UI elements to their `render` prop. Buttons swap cleanly. Sliders and menus keep Video.js behaviour and take Base UI-style classes, because a library slider or menu cannot be rendered into ours without double-handling.',
  },
  {
    value: 'hooks',
    label: 'Base UI components + Video.js hooks',
    blurb:
      'Build the bar from Base UI Button, Toggle, Slider, Menu, Popover, and Tooltip, fed by usePlayer(selector) state, store actions, and the option hooks. Popups portal into the player container so fullscreen keeps them.',
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

/** Shared bar layout: bottom gradient plus a column for the slider row and the button row. */
export const BAR_CLASS =
  'absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-10 pb-2 text-white transition-opacity duration-300';
export const BAR_HIDDEN_CLASS = 'opacity-0 pointer-events-none';
export const ROW_CLASS = 'flex items-center gap-1';
/** Base UI ghost icon button on a dark surface. */
export const ICON_BUTTON_CLASS = 'text-white hover:bg-white/15 hover:text-white [&_svg]:size-6';
export const POPUP_CLASS =
  'rounded-lg border border-white/10 bg-neutral-900/95 p-1 text-sm text-white shadow-xl outline-none backdrop-blur';
export const MENU_ITEM_CLASS =
  'flex cursor-default items-center gap-2 rounded-md py-1.5 pr-3 pl-7 outline-none select-none data-[highlighted]:bg-white/15';
export const MENU_LABEL_CLASS = 'px-2 pt-2 pb-1 text-xs font-semibold tracking-wide text-white/60 uppercase';
export const TOOLTIP_CLASS =
  'rounded-md bg-white px-2.5 py-1 text-xs font-medium text-neutral-900 shadow-md data-[side=top]:mb-1';

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
  // The sandbox shell's width control drives `--sandbox-player-width`; match the packaged skins' frame.
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
