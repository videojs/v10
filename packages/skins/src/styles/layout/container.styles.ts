import { styles } from 'vjsc/styles';

export default styles({
  file: 'container.css',
  rules: {
    skin: {
      className: 'media-skin',
      utilities: [],
    },
    root: {
      className: 'media-container',
      scopeRoot: true,
      utilities: [
        'relative isolate block h-full w-full overflow-clip rounded-[var(--media-video-border-radius)] bg-media-background @container/media-root [container-type:size]',
        '[--spacing:var(--media-spacing)] font-media text-media leading-normal subpixel-antialiased',
        'outline-2 -outline-offset-4 outline-transparent transition-[outline-offset,outline-color] duration-(--media-duration-fast) ease-out',
        'focus-visible:outline-media-ring focus-visible:outline-offset-2',
        'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
        'after:shadow-[inset_0_0_0_1px_var(--media-frame-border)] [&:fullscreen]:after:hidden',
        '[&:fullscreen]:[--media-video-border-radius:0] [&:fullscreen]:[--media-object-fit:contain]',
        'min-[1280px]:[&:fullscreen]:[--media-scale:1.25] min-[1536px]:[&:fullscreen]:[--media-scale:1.5]',
        'min-[1920px]:[&:fullscreen]:[--media-scale:1.75]',
      ],
    },
  },
});
