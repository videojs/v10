import { cn } from '@videojs/utils/style';

export const inputIndicator = cn(
  'absolute inset-0 pointer-events-none',
  'grid grid-cols-3 items-center justify-items-center overflow-hidden',
  'rounded-[inherit]',
  'text-white'
);

export const topIndicatorRoot = cn(
  'group/input-indicator',
  'absolute top-0 inset-x-0',
  'pt-3 pb-32',
  'flex justify-center',
  'text-inherit font-medium',
  'origin-top pointer-events-none',
  'duration-100 ease-out',
  'data-starting-style:opacity-0',
  'data-ending-style:opacity-0',
  'data-starting-style:duration-400',
  'data-starting-style:ease-in',
  'data-ending-style:duration-400',
  'data-ending-style:ease-in',
  '[background-image:linear-gradient(to_bottom,oklch(0_0_0/0.35),oklch(0_0_0/0.2)_--spacing(12),oklch(0_0_0/0))]',
  'text-shadow-2xs text-shadow-(color:--media-shadow-current-color)',
  'pointer-fine:will-change-[translate,filter,opacity]',
  'pointer-fine:transition-[translate,filter,opacity]',
  'pointer-coarse:will-change-[translate,opacity]',
  'pointer-coarse:transition-[translate,opacity]',
  'pointer-fine:motion-safe:data-starting-style:blur-sm',
  'pointer-fine:motion-safe:data-ending-style:blur-sm',
  'motion-safe:data-ending-style:-translate-y-full'
);

export const topIndicatorContent = cn(
  'flex justify-between items-center gap-2 px-2.5 py-1',
  '*:last:ml-auto',
  '[@media(prefers-reduced-transparency:reduce)]:bg-(--media-controls-background-color)',
  '[@media(prefers-reduced-transparency:reduce)]:rounded-[--spacing(2)]',
  'contrast-more:bg-(--media-controls-background-color) contrast-more:rounded-[--spacing(2)]'
);

export const topIndicatorIcon = cn('hidden shrink-0', 'drop-shadow-[0_1px_0_var(--media-shadow-current-color)]');

export const centeredIndicatorRoot = cn(
  'group/input-indicator',
  'col-start-2 row-start-1',
  'grid place-content-center text-center p-4'
);
