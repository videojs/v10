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

const popupSafeArea = [
  'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
  'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)',
] as const;

const surfaceBase = [
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
] as const;

const defaultSurface = [
  ...surfaceBase,
  'shadow-sm shadow-black/15 ring-1 ring-black/10',
  '[@media(prefers-reduced-transparency:reduce)]:shadow-sm [@media(prefers-reduced-transparency:reduce)]:shadow-black/15',
  'contrast-more:shadow-sm contrast-more:shadow-black/15',
  'forced-colors:shadow-sm forced-colors:shadow-black/15',
  'bg-white/10',
] as const;

const minimalSurface = [
  ...surfaceBase,
  'shadow-sm shadow-black/20 ring-1 ring-white/10',
  '[@media(prefers-reduced-transparency:reduce)]:shadow-sm [@media(prefers-reduced-transparency:reduce)]:shadow-black/20',
  'contrast-more:shadow-sm contrast-more:shadow-black/20',
  'forced-colors:shadow-sm forced-colors:shadow-black/20',
  'bg-black/50',
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

const minimalAudioPopup = [
  'data-[side=left]:rounded-none data-[side=left]:border-0 data-[side=left]:py-0 data-[side=left]:pe-16 data-[side=left]:ps-2',
  'data-[side=left]:bg-transparent! data-[side=left]:bg-linear-to-l data-[side=left]:from-(--media-audio-controls-background-color) data-[side=left]:from-80% data-[side=left]:to-transparent',
  'data-[side=left]:shadow-none! data-[side=left]:ring-0! data-[side=left]:backdrop-filter-none data-[side=left]:after:hidden',
  'data-[side=left]:[--media-popover-side-offset:0rem]',
] as const;

export default styles({
  file: 'popups.css',
  layer: 'videojs.components',
  rules: {
    popup: {
      className: 'media-volume-popover',
      utilities: [
        ...popup,
        ...popupTransition,
        ...popupSafeArea,
        'rounded-media-control px-0 py-3',
        'data-[side=right]:rounded-none data-[side=right]:bg-transparent data-[side=right]:p-0 data-[side=right]:px-3 data-[side=right]:shadow-none! data-[side=right]:ring-0! data-[side=right]:backdrop-filter-none data-[side=right]:after:hidden',
        'data-[side=right]:[--media-popover-side-offset:0rem]',
      ],
      variants: {
        default: [
          '[--media-popup-translate-distance:calc(var(--media-scale-unit,16px)*0.5)]',
          'data-starting-style:blur-xs',
          ...defaultSurface,
        ],
        minimal: ['[--media-popup-translate-distance:--spacing(2)]', ...minimalSurface],
        'default-audio': defaultAudioSurface,
        'default-live-audio': defaultAudioSurface,
        'minimal-audio': [...minimalAudioSurface, ...minimalAudioPopup],
        'minimal-live-audio': [...minimalAudioSurface, ...minimalAudioPopup],
      },
    },
  },
});
