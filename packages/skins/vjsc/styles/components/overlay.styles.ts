import { styles } from 'vjsc/styles';

export default styles({
  file: 'overlays.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-overlay',
      utilities: [
        'pointer-events-none absolute inset-0 flex flex-col items-start rounded-[inherit] opacity-0',
        'backdrop-blur-none backdrop-saturate-100',
        'transition-[opacity,backdrop-filter] duration-(--media-controls-transition-duration) ease-out',
        'peer-data-visible/controls:opacity-100',
        'peer-data-visible/buffering:bg-black/35 peer-data-visible/buffering:bg-none peer-data-visible/buffering:opacity-100 peer-data-visible/buffering:backdrop-blur-sm',
        'peer-data-open/error:opacity-100 peer-data-open/error:backdrop-blur-lg peer-data-open/error:backdrop-saturate-150',
      ],
      variants: {
        default: [
          'bg-linear-to-t from-black/50 via-black/30 via-25% to-transparent',
          'peer-data-open/error:duration-350 peer-data-open/error:delay-100',
        ],
        minimal: [
          'bg-linear-to-t from-black/70 via-black/50 via-[length:calc(var(--media-spacing)*30)] to-transparent',
          'peer-data-open/error:duration-150 peer-data-open/error:delay-100',
          'peer-data-open/error:backdrop-saturate-120',
        ],
      },
    },
  },
});
