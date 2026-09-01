import { styles } from 'vjsc/styles';

export default styles({
  file: 'video/controls.css',
  rules: {
    root: {
      className: 'video-controls',
      utilities: [],
    },
    surface: {
      className: 'video-controls-surface',
      utilities: [
        '@lg/media-root:bg-media-popover @lg/media-root:text-media-popover-foreground',
        '@lg/media-root:backdrop-blur-lg @lg/media-root:backdrop-saturate-150',
        '@lg/media-root:shadow-media-sm',
        '@lg/media-root:after:pointer-events-none @lg/media-root:after:absolute @lg/media-root:after:inset-0',
        '@lg/media-root:after:z-10 @lg/media-root:after:rounded-[inherit]',
        '@lg/media-root:after:shadow-media-surface-inset',
        '@lg/media-root:opaque:bg-media-background @lg/media-root:opaque:backdrop-filter-none',
        '@lg/media-root:opaque:after:shadow-media-surface-inset-opaque',
        '@lg/media-root:forced-colors:bg-[Canvas] @lg/media-root:forced-colors:text-[CanvasText]',
        '@lg/media-root:forced-colors:ring-[CanvasText]',
        '@lg/media-root:forced-colors:after:shadow-media-surface-inset-forced',
      ],
    },
  },
});
