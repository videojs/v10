import { styles } from 'vjsc/styles';
import { defaultSurface, minimalSurface } from '../surface';

const popupBase = [
  'm-0 overflow-visible border-0 text-inherit',
  'transition-[opacity,filter,transform,scale] duration-100 ease-out motion-reduce:duration-0',
  'data-starting-style:opacity-0 data-starting-style:scale-95',
  'data-[side=top]:data-starting-style:translate-y-(--popup-translate-distance)',
  'data-[side=bottom]:data-starting-style:-translate-y-(--popup-translate-distance)',
  'data-[side=left]:data-starting-style:translate-x-(--popup-translate-distance)',
  'data-[side=right]:data-starting-style:-translate-x-(--popup-translate-distance)',
  'data-ending-style:opacity-0 data-ending-style:blur-xs data-ending-style:scale-95 data-ending-style:transform-none',
  'data-ending-style:duration-50 motion-reduce:data-ending-style:duration-0',
  'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left',
  'before:pointer-events-auto before:absolute',
  'data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full',
  'data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full',
  'data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full',
  'data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full',
];

const popupVariants = {
  default: ['[--popup-translate-distance:calc(var(--media-scale-unit,16px)*0.5)]', 'data-starting-style:blur-xs'],
  minimal: '[--popup-translate-distance:--spacing(2)]',
} as const;

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
        'min-w-[1.5em] rounded-[--spacing(1)] p-[0.1em] text-center text-media-sm [font-family:inherit] font-semibold leading-tight',
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
