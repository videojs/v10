import { styles } from 'vjsc/styles';

const popupBase = [
  'm-0 overflow-visible border-0 text-inherit',
  'transition-[opacity,filter,transform,scale] duration-100 ease-out motion-reduce:duration-0',
  'data-starting-style:opacity-0 data-starting-style:scale-95',
  'data-starting-style:[transform:translate(var(--media-popup-translate-x,0),var(--media-popup-translate-y,0))]',
  'data-ending-style:opacity-0 data-ending-style:blur-xs data-ending-style:scale-95 data-ending-style:transform-none',
  'data-ending-style:duration-50 motion-reduce:data-ending-style:duration-0',
  'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left',
  'data-[side=top]:[--media-popup-translate-y:var(--media-popup-translate-distance)]',
  'data-[side=bottom]:[--media-popup-translate-y:calc(var(--media-popup-translate-distance)*-1)]',
  'data-[side=left]:[--media-popup-translate-x:var(--media-popup-translate-distance)]',
  'data-[side=right]:[--media-popup-translate-x:calc(var(--media-popup-translate-distance)*-1)]',
  'before:pointer-events-auto before:absolute',
  'data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full',
  'data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full',
  'data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full',
  'data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full',
];

const popupVariants = {
  default: ['[--media-popup-translate-distance:calc(var(--media-scale-unit,16px)*0.5)]', 'data-starting-style:blur-xs'],
  minimal: '[--media-popup-translate-distance:--spacing(2)]',
} as const;

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

const defaultSurfaceFrame = [
  'shadow-sm shadow-black/15 ring-1 ring-black/10',
  '[@media(prefers-reduced-transparency:reduce)]:shadow-sm [@media(prefers-reduced-transparency:reduce)]:shadow-black/15',
  'contrast-more:shadow-sm contrast-more:shadow-black/15',
  'forced-colors:shadow-sm forced-colors:shadow-black/15',
] as const;

const minimalSurfaceFrame = [
  'shadow-sm shadow-black/20 ring-1 ring-white/10',
  '[@media(prefers-reduced-transparency:reduce)]:shadow-sm [@media(prefers-reduced-transparency:reduce)]:shadow-black/20',
  'contrast-more:shadow-sm contrast-more:shadow-black/20',
  'forced-colors:shadow-sm forced-colors:shadow-black/20',
] as const;

export const defaultSurface = [...surfaceBase, ...defaultSurfaceFrame, 'bg-white/10'] as const;

export const minimalSurface = [...surfaceBase, ...minimalSurfaceFrame, 'bg-black/50'] as const;

export const minimalSurfaceFrameOnly = [...minimalSurfaceFrame] as const;

export default styles({
  file: 'popups.css',
  layer: 'videojs.components',
  rules: {
    surface: {
      className: 'media-surface',
      utilities: [],
      variants: { default: defaultSurface, minimal: minimalSurface },
    },
    popover: {
      className: 'media-popover',
      utilities: [
        ...popupBase,
        'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
        'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)',
      ],
      variants: popupVariants,
    },
    tooltip: {
      className: 'media-tooltip',
      utilities: [
        ...popupBase,
        'm-0 whitespace-nowrap border-0 text-media',
        'data-open:flex data-open:items-center data-open:gap-1',
        'data-[side=top]:before:h-(--media-tooltip-side-offset) data-[side=bottom]:before:h-(--media-tooltip-side-offset)',
        'data-[side=left]:before:w-(--media-tooltip-side-offset) data-[side=right]:before:w-(--media-tooltip-side-offset)',
      ],
      variants: {
        default: [...popupVariants.default, 'rounded-[9999px] px-2.5 py-1'],
        minimal: [
          popupVariants.minimal,
          'rounded-[--spacing(2)] bg-black/50 px-2 py-1 text-current shadow-md shadow-black/20 ring-1 ring-white/10 backdrop-blur-lg backdrop-saturate-150',
        ],
      },
    },
    shortcut: {
      className: 'media-tooltip-shortcut',
      utilities:
        'min-w-[1.5em] rounded-[--spacing(1)] p-[0.1em] text-center text-[calc(var(--media-spacing)*2.75)] [font-family:inherit] font-semibold leading-[1.25]',
      variants: {
        default: 'bg-current/30',
        minimal: '-me-1 bg-current/15',
      },
    },
    volume: {
      className: 'media-volume-popover',
      utilities: [
        ...popupBase,
        'rounded-media-control px-0 py-3',
        'data-[side=right]:rounded-none data-[side=right]:bg-transparent data-[side=right]:p-0 data-[side=right]:shadow-none data-[side=right]:ring-0 data-[side=right]:backdrop-filter-none data-[side=right]:after:hidden',
        'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
        'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)',
        'has-[media-volume-slider[data-hidden]]:hidden',
      ],
      variants: popupVariants,
    },
  },
});
