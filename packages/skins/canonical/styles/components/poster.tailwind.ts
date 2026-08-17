import { defineStyles } from '../define';

export default defineStyles({
  role: 'poster',
  styles: {
    poster: [
      'pointer-events-none absolute inset-0 h-full w-full rounded-[inherit]',
      '[object-fit:var(--media-object-fit,contain)] [object-position:var(--media-object-position,center)]',
      'transition-opacity duration-250 not-data-visible:opacity-0',
      '[&[data-visible]:not([data-loaded])]:opacity-0',
      'before:pointer-events-none before:absolute before:inset-0',
      'before:[background-image:var(--media-poster-placeholder,none)] before:bg-no-repeat',
      'before:[background-position:var(--media-object-position,center)]',
      'before:[background-size:var(--media-object-fit,contain)]',
      'before:[filter:blur(var(--media-poster-placeholder-blur,20px))]',
      '[&_::slotted(img)]:absolute [&_::slotted(img)]:inset-0',
      '[&_::slotted(img)]:h-full [&_::slotted(img)]:w-full [&_::slotted(img)]:rounded-[inherit]',
      '[&_::slotted(img)]:[object-fit:var(--media-object-fit,contain)]',
      '[&_::slotted(img)]:[object-position:var(--media-object-position,center)]',
    ],
  },
});
