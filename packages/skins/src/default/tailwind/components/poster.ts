import { cn } from '@videojs/utils/style';

// Class strings stay literal so Tailwind's scanner can see them.

/**
 * The image `media-poster` owns, reachable only as a shadow part. It is held
 * back until it loads so the poster placeholder behind it shows first; an image
 * the author supplied reports nothing and is left alone.
 */
const ownedImage = [
  '[&::part(img)]:absolute',
  '[&::part(img)]:inset-0',
  '[&::part(img)]:w-full',
  '[&::part(img)]:h-full',
  '[&::part(img)]:[object-fit:var(--media-object-fit,contain)]',
  '[&::part(img)]:[object-position:var(--media-object-position,center)]',
  '[&::part(img)]:rounded-(--media-video-border-radius)',
  '[&::part(img)]:transition-opacity',
  '[&::part(img)]:duration-250',
  'not-data-loaded:[&::part(img)]:opacity-0',
];

/** An image slotted through the skin, which descendant selectors can't reach. */
const slottedImage = [
  '[&_::slotted(img)]:absolute',
  '[&_::slotted(img)]:inset-0',
  '[&_::slotted(img)]:w-full',
  '[&_::slotted(img)]:h-full',
  '[&_::slotted(img)]:[object-fit:var(--media-object-fit,contain)]',
  '[&_::slotted(img)]:[object-position:var(--media-object-position,center)]',
  '[&_::slotted(img)]:rounded-(--media-video-border-radius)',
];

/** An image an ejected skin inlines where the slot used to be. */
const inlinedImage = [
  '[&_img]:absolute',
  '[&_img]:inset-0',
  '[&_img]:w-full',
  '[&_img]:h-full',
  '[&_img]:[object-fit:var(--media-object-fit,contain)]',
  '[&_img]:[object-position:var(--media-object-position,center)]',
  '[&_img]:rounded-(--media-video-border-radius)',
];

export const poster = (isShadowDOM: boolean) =>
  cn(
    // The element — `media-poster` in HTML, the image itself in React.
    'absolute inset-0 w-full h-full pointer-events-none',
    'transition-opacity duration-250',
    'not-data-visible:opacity-0',
    isShadowDOM
      ? [...ownedImage, ...slottedImage, ...inlinedImage]
      : [
          'rounded-[inherit] [object-fit:var(--media-object-fit,contain)] [object-position:var(--media-object-position,center)]',
          // Hide until the image has loaded so the poster placeholder shows first
          '[&[data-visible]:not([data-loaded])]:opacity-0',
        ]
  );
