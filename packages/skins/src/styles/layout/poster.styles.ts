import { styles } from 'vjsc/styles';

export default styles({
  file: 'poster.css',
  prefix: 'media-poster',
  rules: {
    root: {
      utilities: [
        'pointer-events-none layer-media',
        'transition-opacity duration-media-slower not-data-visible:opacity-0',
      ],
      variants: {
        // An image slotted in from outside the skin cannot carry the image class, so the root sizes it.
        'shadow-dom': [
          '[&>slot::slotted(img:not([src]):not([srcset]))]:invisible',
          '[&>slot::slotted(img)]:layer-media [&>slot::slotted(img)]:object-media',
        ],
      },
    },
    image: {
      utilities: ['layer-media object-media', '[&:not([src]):not([srcset])]:invisible'],
    },
  },
});
