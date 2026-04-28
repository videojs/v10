import { cn } from '@videojs/utils/style';

/**
 * Live button: wide pill button with a status dot (gray → red at the live
 * edge) and a "LIVE" text label.
 *
 * The `button` class makes the button itself the Tailwind `group/live` so
 * children can react to `data-live-edge` via group selectors.
 */
export const liveButton = {
  button: cn('group/live', 'inline-flex items-center gap-1.5', 'aspect-auto w-auto px-3 py-2'),
  indicator: cn(
    'inline-block size-2 shrink-0 rounded-full',
    'bg-current/40 transition-colors duration-150 ease-out',
    'group-data-[live-edge]/live:bg-red-500'
  ),
  label: 'text-xs font-semibold uppercase tracking-wider leading-none',
};
