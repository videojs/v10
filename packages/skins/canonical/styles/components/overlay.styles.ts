import { styles } from 'vjsc/styles';

export default styles({
  file: 'overlays.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-overlay',
      utilities: [
        'pointer-events-none absolute inset-0 rounded-[inherit] opacity-0',
        'bg-linear-to-t from-black/50 via-black/30 via-25% to-transparent',
        'transition-[opacity,backdrop-filter] duration-(--media-controls-transition-duration) ease-out',
        'peer-data-visible/controls:opacity-100',
        'peer-data-visible/buffering:bg-black/35 peer-data-visible/buffering:opacity-100 peer-data-visible/buffering:backdrop-blur-xs',
        'peer-data-open/error:opacity-100 peer-data-open/error:backdrop-blur-lg peer-data-open/error:backdrop-saturate-150',
      ],
    },
  },
});
