import { cn } from '@videojs/utils/style';
import { reset } from './reset';

export const container = cn(
  reset,
  // Layout & containment
  'block relative isolate h-full w-full @container/media-container',
  // Appearance
  'rounded-(--media-border-radius,2rem)',
  'font-[Inter_Variable,Inter,ui-sans-serif,system-ui,sans-serif] text-[0.8125rem] leading-normal subpixel-antialiased',
  // Focus ring
  'outline-2 outline-transparent -outline-offset-4',
  'transition-[outline-offset,outline-color] duration-100 ease-out',
  'focus-visible:outline-current focus-visible:outline-offset-2'
);
