import { styles } from 'vjsc/styles';

const popupBase = [
  'm-0 overflow-visible border-0 text-inherit',
  'transition-[opacity,filter,transform,scale] duration-100 ease-out motion-reduce:duration-0',
  'data-starting-style:opacity-0 data-starting-style:blur-xs data-starting-style:scale-95',
  'data-ending-style:opacity-0 data-ending-style:blur-xs data-ending-style:scale-95',
  'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left',
  'before:pointer-events-auto before:absolute',
  'data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full',
  'data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full',
  'data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full',
  'data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full',
];

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
      utilities: 'relative',
      variants: { default: defaultSurface, minimal: minimalSurface },
    },
    popover: {
      className: 'media-popover',
      utilities: [
        ...popupBase,
        'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
        'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)',
      ],
    },
    tooltip: {
      className: 'media-tooltip',
      utilities: [
        ...popupBase,
        'm-0 whitespace-nowrap rounded-media-control border-0 px-2.5 py-[0.35rem]',
        'data-open:flex data-open:items-center data-open:gap-1',
        'data-[side=top]:before:h-(--media-tooltip-side-offset) data-[side=bottom]:before:h-(--media-tooltip-side-offset)',
        'data-[side=left]:before:w-(--media-tooltip-side-offset) data-[side=right]:before:w-(--media-tooltip-side-offset)',
      ],
    },
    shortcut: {
      className: 'media-tooltip-shortcut',
      utilities: 'min-w-6 rounded-sm bg-current/30 p-[0.1em] text-center text-[0.75em] font-semibold leading-tight',
    },
    volume: {
      className: 'media-volume-popover',
      utilities: [
        ...popupBase,
        'rounded-media-control py-3',
        'data-[side=right]:bg-transparent data-[side=right]:p-0 data-[side=right]:shadow-none data-[side=right]:ring-0 data-[side=right]:backdrop-filter-none data-[side=right]:after:hidden',
        'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
        'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)',
        'has-[media-volume-slider[data-hidden]]:hidden',
      ],
    },
  },
});
