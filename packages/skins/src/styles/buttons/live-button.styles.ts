import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  prefix: 'media-live-button',
  rules: {
    root: {
      utilities: [
        'inline-flex! w-auto items-center gap-1.5 px-3 py-2',
        'text-media-sm leading-none font-semibold tracking-wider uppercase',
        'before:inline-block before:size-2 before:shrink-0 before:rounded-media-pill',
        'before:bg-current/40 before:transition-[background-color] before:duration-media-base before:ease-out',
        'data-live-edge:before:bg-media-live',
      ],
    },
  },
});
