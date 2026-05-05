import { cn } from '@videojs/utils/style';

export const reset = cn(
  '**:box-border',
  // Keep authored templates hidden even when component classes set display.
  '[&_[hidden][hidden]]:hidden',
  '[&_button]:font-[inherit]',
  'motion-safe:[interpolate-size:allow-keywords]'
);
