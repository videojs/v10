import { styles } from 'vjsc/styles';

export default styles({
  file: 'poster.css',
  rules: {
    root: {
      className: 'media-poster',
      utilities: [
        'pointer-events-none absolute inset-0 h-full w-full rounded-[inherit]',
        '[object-fit:var(--media-object-fit,contain)] [object-position:var(--media-object-position,center)]',
        'transition-opacity duration-250 not-data-visible:opacity-0',
        '[&:is(img):not([src]):not([srcset])]:invisible',
        '[&_img]:absolute [&_img]:inset-0 [&_img]:h-full [&_img]:w-full [&_img]:rounded-[inherit]',
        '[&_img]:[object-fit:var(--media-object-fit,contain)]',
        '[&_img]:[object-position:var(--media-object-position,center)]',
      ],
      variants: {
        'shadow-dom': [
          '[&>slot>img:not([src]):not([srcset])]:invisible',
          '[&>slot::slotted(img:not([src]):not([srcset]))]:invisible',
          '[&>slot::slotted(img)]:absolute [&>slot::slotted(img)]:inset-0',
          '[&>slot::slotted(img)]:h-full [&>slot::slotted(img)]:w-full [&>slot::slotted(img)]:rounded-[inherit]',
          '[&>slot::slotted(img)]:[object-fit:var(--media-object-fit,contain)]',
          '[&>slot::slotted(img)]:[object-position:var(--media-object-position,center)]',
        ],
      },
    },
  },
});
