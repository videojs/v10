import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-live-button',
      utilities: [
        'inline-flex! w-auto! items-center gap-1.5 px-3! py-2!',
        'text-media-sm leading-none font-semibold tracking-wider uppercase',
        'before:inline-block before:size-2 before:shrink-0 before:rounded-[99px]',
        'before:bg-current/40 before:transition-[background-color] before:duration-150 before:ease-out',
        'data-live-edge:before:bg-[oklch(0.65_0.22_27)]',
      ],
    },
  },
});
