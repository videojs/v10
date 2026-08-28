import { styles } from 'vjsc/styles';

const popup = [
  'm-0 overflow-visible border-0 text-inherit',
  'data-starting-style:opacity-0 data-starting-style:[transform:scale(.95)]',
  'data-ending-style:opacity-0 data-ending-style:blur-xs data-ending-style:[transform:scale(.95)]',
  'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left',
  'data-[side=top]:data-starting-style:[transform:translateY(var(--media-popup-translate-distance))_scale(.95)]',
  'data-[side=bottom]:data-starting-style:[transform:translateY(calc(var(--media-popup-translate-distance)*-1))_scale(.95)]',
  'data-[side=left]:data-starting-style:[transform:translateX(var(--media-popup-translate-distance))_scale(.95)]',
  'data-[side=right]:data-starting-style:[transform:translateX(calc(var(--media-popup-translate-distance)*-1))_scale(.95)]',
  'before:pointer-events-auto before:absolute',
  'data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full',
  'data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full',
  'data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full',
  'data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full',
] as const;

const popupTransition = [
  'transition-[opacity,filter,transform,scale] duration-100 ease-out motion-reduce:duration-0',
  'data-ending-style:duration-50 motion-reduce:data-ending-style:duration-0',
] as const;

const defaultSurface = [
  'text-white backdrop-blur-lg backdrop-saturate-150',
  'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
  'after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.1),inset_0_0_0_1px_rgb(255_255_255/0.05)]',
  '[@media(prefers-reduced-transparency:reduce)]:bg-black [@media(prefers-reduced-transparency:reduce)]:ring-1 [@media(prefers-reduced-transparency:reduce)]:ring-transparent',
  '[@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  '[@media(prefers-reduced-transparency:reduce)]:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  'contrast-more:bg-black contrast-more:ring-1 contrast-more:ring-transparent contrast-more:backdrop-filter-none',
  'contrast-more:after:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.125)]',
  'forced-colors:bg-[Canvas] forced-colors:ring-1 forced-colors:ring-[CanvasText]',
  'forced-colors:after:shadow-[inset_0_1px_0_0_CanvasText,inset_0_0_0_1px_CanvasText]',
  'shadow-sm shadow-black/15 ring-1 ring-black/10',
  '[@media(prefers-reduced-transparency:reduce)]:shadow-sm [@media(prefers-reduced-transparency:reduce)]:shadow-black/15',
  'contrast-more:shadow-sm contrast-more:shadow-black/15',
  'forced-colors:shadow-sm forced-colors:shadow-black/15',
  'bg-white/10',
] as const;

const minimalTooltipSurface = [
  'bg-black/50 backdrop-blur-lg backdrop-saturate-150',
  'shadow-md shadow-black/20 ring-1 ring-white/10',
  '[@media(prefers-reduced-transparency:reduce)]:bg-black [@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  'contrast-more:bg-black contrast-more:backdrop-filter-none',
] as const;

const defaultAudioSurface = [
  'bg-(--media-audio-controls-background-color)! [color:var(--media-audio-text-color)]!',
  'shadow-sm shadow-black/15 ring-1 ring-black/10',
  'backdrop-blur-lg backdrop-saturate-150',
  '[@media(prefers-reduced-transparency:reduce)]:bg-[light-dark(white,black)]!',
  'contrast-more:bg-[light-dark(white,black)]!',
] as const;

const minimalAudioSurface = [
  'bg-(--media-audio-controls-background-color)! [color:var(--media-audio-text-color)]!',
  'shadow-sm shadow-black/20 ring-1 ring-[light-dark(rgb(0_0_0/0.1),rgb(255_255_255/0.1))]',
  'backdrop-blur-lg backdrop-saturate-150',
  '[@media(prefers-reduced-transparency:reduce)]:backdrop-filter-none',
  'contrast-more:backdrop-filter-none',
] as const;

export default styles({
  file: 'popups.css',
  layer: 'videojs.components',
  rules: {
    popup: {
      className: 'media-tooltip',
      utilities: [
        ...popup,
        ...popupTransition,
        'data-[side=top]:before:h-(--media-tooltip-side-offset) data-[side=bottom]:before:h-(--media-tooltip-side-offset)',
        'data-[side=left]:before:w-(--media-tooltip-side-offset) data-[side=right]:before:w-(--media-tooltip-side-offset)',
        'whitespace-nowrap text-media',
        'data-open:flex data-open:items-center data-open:gap-1',
      ],
      variants: {
        default: [
          '[--media-popup-translate-distance:calc(var(--media-scale-unit,16px)*0.5)]',
          'data-starting-style:blur-xs',
          ...defaultSurface,
          'rounded-[9999px] px-2.5 py-1',
        ],
        minimal: [
          '[--media-popup-translate-distance:--spacing(2)]',
          ...minimalTooltipSurface,
          'rounded-[--spacing(2)] px-2 py-1 text-current',
        ],
        'default-audio': defaultAudioSurface,
        'default-live-audio': defaultAudioSurface,
        'minimal-audio': minimalAudioSurface,
        'minimal-live-audio': minimalAudioSurface,
      },
    },
    shortcut: {
      className: 'media-tooltip-shortcut',
      utilities:
        'min-w-[1.5em] rounded-[--spacing(1)] p-[0.1em] text-center text-media-sm [font-family:inherit] font-semibold leading-tight',
      variants: {
        default: 'bg-current/30',
        minimal: '-me-1 bg-current/15',
      },
    },
  },
});
