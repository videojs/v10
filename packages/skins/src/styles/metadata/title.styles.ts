import { styles } from 'vjsc/styles';

export default styles({
  file: 'title.css',
  prefix: 'media-title',
  rules: {
    root: {
      utilities: [
        'pointer-events-none absolute inset-0 z-20 empty:hidden',
        'bg-(image:--media-title-gradient)',
        'origin-top transition-[filter,opacity,scale,translate] duration-media-controls-half ease-out',
        'not-data-visible:opacity-0',
        'not-data-visible:-translate-y-media-hidden-offset',
        'pointer-fine:not-data-visible:blur-media-hidden',
        'not-data-visible:duration-media-controls',
      ],
      variants: {
        default: 'not-data-visible:scale-media-hidden',
        minimal: [
          'transition-[filter,opacity,translate]',
          'not-data-visible:-translate-y-[min(var(--media-hidden-offset),var(--media-control-size))]',
        ],
      },
    },
    content: {
      utilities: [
        'flex items-center wrap-anywhere px-6 pt-2.5 text-media font-medium tracking-[-0.0125em] text-media-controls-foreground text-shadow-media',
        'media-md:text-media-xl media-md:px-6 media-md:pt-4',
        'data-hidden:hidden',
      ],
      variants: {
        default: 'media-max-lg:pr-36 min-h-[calc(var(--media-control-size)+(--spacing(2)))]',
        minimal: 'font-normal px-4',
      },
    },
  },
});
