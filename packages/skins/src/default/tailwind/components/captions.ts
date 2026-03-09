import { cn } from '@videojs/utils/style';

export const captions = {
  root: cn(
    'absolute z-20 pointer-events-none text-balance text-base',
    'inset-x-4 bottom-6',
    'transition-transform duration-150 ease-out delay-600',
    'motion-reduce:duration-50',
    // Responsive font sizes
    '@xs/media-root:text-2xl',
    '@3xl/media-root:text-3xl',
    '@7xl/media-root:text-4xl',
    // Shift up when controls visible
    'peer-data-visible/controls:-translate-y-12 peer-data-visible/controls:delay-25'
  ),
  container: 'max-w-[42ch] mx-auto text-center flex flex-col items-center',
  cue: cn(
    'block py-0.5 px-2 text-white text-center whitespace-pre-wrap leading-1.2',
    '[text-shadow:0_0_1px_oklab(0_0_0_/_0.7),0_0_8px_oklab(0_0_0_/_0.7)]',
    'contrast-more:[text-shadow:none] contrast-more:[box-decoration-break:clone] contrast-more:bg-black/70',
    '*:inline'
  ),
};
