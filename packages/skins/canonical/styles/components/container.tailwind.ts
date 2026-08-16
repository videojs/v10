import { defineStyles } from '../define';

export default defineStyles({
  role: 'container',
  styles: {
    container: [
      'relative isolate block h-full w-full overflow-hidden rounded-[var(--media-video-border-radius)] bg-black @container/media-root',
      '[--spacing:var(--media-spacing)] font-sans text-media leading-normal subpixel-antialiased',
      'outline-2 -outline-offset-4 outline-transparent transition-[outline-offset,outline-color] duration-100 ease-out motion-reduce:duration-50',
      'focus-visible:outline-media-focus focus-visible:outline-offset-2',
      'pointer-fine:has-[[data-controls]:not([data-visible])]:cursor-none',
      '[&_video]:block [&_video]:h-full [&_video]:w-full [&_video]:rounded-[inherit]',
      '[&_video]:[object-fit:var(--media-object-fit,contain)]',
      '[&_video]:[object-position:var(--media-object-position,center)]',
      'before:pointer-events-none before:absolute before:inset-0',
      'before:[background-image:var(--media-poster-placeholder,none)] before:bg-no-repeat',
      'before:[background-position:var(--media-object-position,center)]',
      'before:[background-size:var(--media-object-fit,contain)]',
      'before:opacity-0 before:[filter:blur(var(--media-poster-placeholder-blur,20px))]',
      'before:transition-opacity before:duration-250 before:ease-in-out',
      'has-[img[data-visible]:not([data-loaded])]:before:opacity-100',
      'after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit]',
      'after:shadow-[inset_0_0_0_1px_var(--media-border-color)] [&:fullscreen]:after:hidden',
      '[&:fullscreen]:[--media-video-border-radius:0] [&:fullscreen_video]:object-contain',
      'min-[1280px]:[&:fullscreen]:[--media-scale:1.25] min-[1536px]:[&:fullscreen]:[--media-scale:1.5]',
      'min-[1920px]:[&:fullscreen]:[--media-scale:1.75]',
    ],
  },
});
