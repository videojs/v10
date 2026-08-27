import { styles } from 'vjsc/styles';

export default styles({
  file: 'container.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-container',
      scopeRoot: true,
      utilities: [
        'relative isolate block h-full w-full overflow-hidden rounded-[var(--media-video-border-radius)] bg-black @container/media-root [container-type:size]',
        '[--spacing:var(--media-spacing)] font-media text-media leading-normal subpixel-antialiased',
        'outline-2 -outline-offset-4 outline-transparent transition-[outline-offset,outline-color] duration-100 ease-out motion-reduce:duration-50',
        'focus-visible:outline-[light-dark(rgb(0_0_0),rgb(255_255_255))] focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[CanvasText]',
        'pointer-fine:not-data-controls-visible:cursor-none',
        'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
        'forced-colors:after:shadow-[inset_0_0_0_1px_CanvasText] [&:fullscreen]:after:hidden',
        '[&:fullscreen]:[--media-video-border-radius:0] [&:fullscreen]:[--media-object-fit:contain]',
        'min-[1280px]:[&:fullscreen]:[--media-scale:1.25] min-[1536px]:[&:fullscreen]:[--media-scale:1.5]',
        'min-[1920px]:[&:fullscreen]:[--media-scale:1.75]',
      ],
      variants: {
        default: 'after:shadow-[inset_0_0_0_1px_light-dark(rgb(0_0_0/0.1),rgb(255_255_255/0.15))]',
        minimal: 'after:shadow-[inset_0_0_0_1px_light-dark(rgb(0_0_0/0.15),rgb(255_255_255/0.15))]',
      },
    },
  },
});
