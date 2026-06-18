import { cn } from '@videojs/utils/style';

export const poster = (isShadowDOM: boolean) =>
  cn(
    'absolute inset-0 w-full h-full pointer-events-none',
    // Fade in/out with the `data-visible` attribute
    'transition-opacity duration-250',
    'not-data-visible:opacity-0',
    // In the shadow DOM, the class applies to the parent so we have to set styles on the slotted img.
    isShadowDOM
      ? [
          '[&_::slotted(img)]:absolute',
          '[&_::slotted(img)]:inset-0',
          '[&_::slotted(img)]:w-full',
          '[&_::slotted(img)]:h-full',
          '[&_::slotted(img)]:[object-fit:var(--media-object-fit,contain)]',
          '[&_::slotted(img)]:[object-position:var(--media-object-position,center)]',
          '[&_::slotted(img)]:rounded-(--media-video-border-radius)',
        ]
      : 'rounded-[inherit] [object-fit:var(--media-object-fit,contain)] [object-position:var(--media-object-position,center)]'
  );
