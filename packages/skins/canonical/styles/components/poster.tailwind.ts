import { defineStyles } from '../define';

export default defineStyles({
  role: 'poster',
  styles: {
    poster: [
      'pointer-events-none absolute inset-0 h-full w-full rounded-[inherit]',
      '[object-fit:var(--media-object-fit,contain)] [object-position:var(--media-object-position,center)]',
      'transition-opacity duration-250 not-data-visible:opacity-0',
      '[&_::slotted(img)]:absolute [&_::slotted(img)]:inset-0',
      '[&_::slotted(img)]:h-full [&_::slotted(img)]:w-full [&_::slotted(img)]:rounded-[inherit]',
      '[&_::slotted(img)]:[object-fit:var(--media-object-fit,contain)]',
      '[&_::slotted(img)]:[object-position:var(--media-object-position,center)]',
      '[&_img]:absolute [&_img]:inset-0',
      '[&_img]:h-full [&_img]:w-full [&_img]:rounded-[inherit]',
      '[&_img]:[object-fit:var(--media-object-fit,contain)]',
      '[&_img]:[object-position:var(--media-object-position,center)]',
    ],
  },
});
