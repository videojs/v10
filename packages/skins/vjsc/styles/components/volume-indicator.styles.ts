import { styles } from 'vjsc/styles';

import { defaultSurface, minimalSurfaceFrameOnly } from './popup.styles';

export default styles({
  file: 'indicator.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-volume-indicator',
      utilities: [
        'group/volume-status pointer-events-none font-medium',
        'transition-[opacity,scale,translate] duration-100 ease-out motion-reduce:duration-50',
        'data-starting-style:opacity-0 data-ending-style:opacity-0',
      ],
      variants: {
        default: [
          ...defaultSurface,
          'absolute top-3 w-[min(80%,12rem)] rounded-media-control bg-black/25',
          'data-starting-style:scale-90',
          'data-ending-style:-translate-y-1/4 data-ending-style:scale-90',
        ],
        minimal: [
          'absolute inset-x-0 top-0 w-full justify-center px-2.5 pt-3 pb-32',
          'status-indicator-gradient',
          'data-starting-style:scale-100 data-ending-style:scale-100 motion-safe:data-ending-style:-translate-y-full',
        ],
      },
    },
    fill: {
      className: 'media-volume-indicator-fill',
      utilities: [
        'flex items-center justify-between gap-2 rounded-[inherit] px-2.5 py-1',
        'bg-left bg-no-repeat [background-image:linear-gradient(var(--media-accent-color,white),var(--media-accent-color,white))]',
        '[background-size:var(--media-volume-fill,0%)_100%] transition-[background-size] duration-200 ease-linear motion-reduce:duration-50',
      ],
      variants: {
        default: 'w-full',
        minimal: [...minimalSurfaceFrameOnly, 'w-[min(80%,14rem)] bg-black/25'],
      },
    },
    icon: {
      className: 'media-volume-indicator-icon',
      utilities: 'hidden shrink-0',
    },
    value: {
      className: 'media-volume-indicator-value',
      utilities: 'ml-auto',
    },
    icons: {
      high: {
        className: 'media-volume-high-indicator-icon',
        utilities: 'group-data-[level=high]/volume-status:block',
      },
      low: {
        className: 'media-volume-low-indicator-icon',
        utilities: 'group-data-[level=low]/volume-status:block',
      },
      off: {
        className: 'media-volume-off-indicator-icon',
        utilities: 'group-data-[level=off]/volume-status:block',
      },
    },
  },
});
