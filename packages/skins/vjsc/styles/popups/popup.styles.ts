import { styles } from 'vjsc/styles';

export default styles({
  file: 'popups.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-popup',
      utilities: [
        'm-0 overflow-visible border-0 text-inherit',
        'data-starting-style:opacity-0 data-starting-style:[transform:translate(var(--media-popup-translate-x-distance,0),var(--media-popup-translate-y-distance,0))_scale(.95)]',
        'data-ending-style:opacity-0 data-ending-style:blur-xs data-ending-style:[transform:scale(.95)]',
        'data-[side=top]:origin-bottom data-[side=bottom]:origin-top data-[side=left]:origin-right data-[side=right]:origin-left',
        'data-[side=top]:[--media-popup-translate-y-distance:var(--media-popup-translate-distance)]',
        'data-[side=bottom]:[--media-popup-translate-y-distance:calc(var(--media-popup-translate-distance)*-1)]',
        'data-[side=left]:[--media-popup-translate-x-distance:var(--media-popup-translate-distance)]',
        'data-[side=right]:[--media-popup-translate-x-distance:calc(var(--media-popup-translate-distance)*-1)]',
        'before:pointer-events-auto before:absolute',
        'data-[side=top]:before:inset-x-0 data-[side=top]:before:top-full',
        'data-[side=bottom]:before:inset-x-0 data-[side=bottom]:before:bottom-full',
        'data-[side=left]:before:inset-y-0 data-[side=left]:before:left-full',
        'data-[side=right]:before:inset-y-0 data-[side=right]:before:right-full',
      ],
      variants: {
        default: [
          '[--media-popup-translate-distance:calc(var(--media-scale-unit,16px)*0.5)]',
          'data-starting-style:blur-xs',
        ],
        minimal: '[--media-popup-translate-distance:--spacing(2)]',
      },
    },
    transition: {
      className: 'media-popup-transition',
      utilities: [
        'transition-[opacity,filter,transform,scale] duration-100 ease-out motion-reduce:duration-0',
        'data-ending-style:duration-50 motion-reduce:data-ending-style:duration-0',
      ],
    },
    safeArea: {
      className: 'media-popup-safe-area',
      utilities: [
        'data-[side=top]:before:h-(--media-popover-side-offset) data-[side=bottom]:before:h-(--media-popover-side-offset)',
        'data-[side=left]:before:w-(--media-popover-side-offset) data-[side=right]:before:w-(--media-popover-side-offset)',
      ],
    },
  },
});
