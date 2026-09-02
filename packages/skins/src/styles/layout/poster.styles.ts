import { styles } from 'vjsc/styles';

export default styles({
  file: 'poster.css',
  rules: {
    root: {
      className: 'media-poster',
      utilities: [
        'pointer-events-none layer-media object-media',
        'transition-opacity duration-media-slower not-data-visible:opacity-0',
        '[&:is(img):not([src]):not([srcset])]:invisible',
        '[&_img]:layer-media [&_img]:object-media',
      ],
      variants: {
        'shadow-dom': [
          '[&>slot>img:not([src]):not([srcset])]:invisible',
          '[&>slot::slotted(img:not([src]):not([srcset]))]:invisible',
          '[&>slot::slotted(img)]:layer-media [&>slot::slotted(img)]:object-media',
        ],
      },
    },
  },
});
