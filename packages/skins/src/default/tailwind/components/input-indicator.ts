import { cn } from '@videojs/utils/style';

export const topIndicatorRoot = cn(
  'group/input-indicator',
  '[--surface-background-color:oklch(0_0_0/0.25)]',
  'absolute top-3 rounded-full origin-top pointer-events-none',
  'text-inherit font-medium',
  'duration-100 ease-out',
  'data-starting-style:opacity-0',
  'data-ending-style:opacity-0',
  'data-starting-style:duration-250',
  'data-starting-style:ease-in',
  'data-ending-style:duration-250',
  'data-ending-style:ease-in',
  'pointer-coarse:will-change-[scale,translate,opacity]',
  'pointer-coarse:transition-[scale,translate,opacity]',
  'pointer-fine:motion-safe:will-change-[scale,translate,filter,opacity]',
  'pointer-fine:motion-safe:transition-[scale,translate,filter,opacity]',
  'pointer-fine:motion-safe:data-starting-style:blur-sm',
  'pointer-fine:motion-safe:data-starting-style:scale-90',
  'pointer-fine:motion-safe:data-ending-style:blur-sm',
  'pointer-fine:motion-safe:data-ending-style:scale-90',
  'motion-safe:data-ending-style:-translate-y-1/4',
  '[@media(prefers-reduced-transparency:reduce)]:[--surface-background-color:oklch(0_0_0)]',
  'contrast-more:[--surface-background-color:oklch(0_0_0)]'
);

export const topIndicatorContent = cn(
  'flex justify-between items-center gap-2 px-2.5 py-1 w-full',
  '**:mix-blend-difference'
);

export const centeredIndicatorRoot = cn(
  'group/input-indicator',
  'col-start-2 row-start-1',
  'grid place-content-center text-center p-4'
);
