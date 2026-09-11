import { styles } from 'vjsc/styles';

export default styles({
  file: 'video/skin.css',
  prefix: 'video-skin',
  rules: {
    root: {
      // The skin root shares the container's scope root, so its rules must also match `:scope`.
      scopeRoot: true,
      utilities: [
        'pointer-fine:not-data-controls-visible:cursor-none bg-transparent!',
        // Keep the letterbox background out of the media's antialiased outer edge.
        'before:pointer-events-none before:absolute before:-z-1 before:bg-media-background',
        'before:inset-[min(1px,var(--media-player-radius))] before:rounded-[max(0px,calc(var(--media-player-radius)-1px))]',
      ],
    },
  },
});
