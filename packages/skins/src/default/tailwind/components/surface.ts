import { cn } from '@videojs/utils/style';

export const surface = cn(
  'bg-(--media-surface-background-color)',
  '[backdrop-filter:var(--media-surface-backdrop-filter)]',
  '[box-shadow:0_0_0_1px_var(--media-surface-outer-border-color),0_1px_3px_0_var(--media-surface-shadow-color),0_1px_2px_-1px_var(--media-surface-shadow-color)]',
  'after:absolute after:inset-0 after:[box-shadow:inset_0_1px_0_0_var(--media-surface-inner-border-color),inset_0_0_0_1px_oklch(from_var(--media-surface-inner-border-color)_l_c_h/calc(alpha*0.5))] after:rounded-[inherit] after:pointer-events-none after:z-10'
);
