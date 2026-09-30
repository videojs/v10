import { styles } from 'vjsc/styles';

export default styles({
  file: 'popups.css',
  prefix: 'media-tooltip',
  rules: {
    popup: {
      utilities: [
        'pointer-events-none z-20 whitespace-nowrap rounded-md bg-media-popover px-1.5 py-0.5 text-media-popover-foreground',
        'surface-media [--media-popup-side-offset:var(--media-tooltip-side-offset)] [--media-tooltip-side-offset:24px]',
        'data-open:flex data-open:items-center data-open:gap-1',
        'media-opaque:outline forced-colors:outline',
      ],
    },
    screenPopup: {
      utilities: '[--media-tooltip-side-offset:8px]!',
    },
    shortcut: {
      utilities: [
        'min-w-[1.5em] rounded-sm bg-media-muted p-[0.1em] -me-0.5 text-center text-[11px] font-semibold leading-tight font-[inherit]',
        'forced-colors:bg-black forced-colors:text-white forced-colors:forced-color-adjust-none',
      ],
    },
  },
});
