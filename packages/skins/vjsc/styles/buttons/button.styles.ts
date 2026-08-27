import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-button',
      utilities: [
        'grid min-h-0 shrink-0 touch-manipulation select-none place-items-center rounded-media-control border-0 bg-transparent p-0 text-center text-inherit [text-shadow:inherit]',
        'cursor-pointer outline-2 outline-transparent -outline-offset-2',
        'will-change-[scale] duration-150 ease-out',
        'not-aria-disabled:hover:bg-media-control-hover not-aria-disabled:hover:text-media-accent-text',
        'not-aria-disabled:focus-visible:bg-media-control-hover not-aria-disabled:focus-visible:text-media-accent-text',
        'not-aria-disabled:aria-expanded:bg-media-control-hover not-aria-disabled:aria-expanded:text-media-accent-text',
        'focus-visible:outline-white focus-visible:outline-offset-2',
        'not-aria-disabled:active:scale-[0.97]',
        'motion-reduce:scale-100 motion-reduce:will-change-auto',
        'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
      ],
      variants: {
        default: [
          'size-9 [transition-property:background-color,color,outline-offset,scale]',
          'motion-reduce:[transition-property:background-color,color]',
        ],
        minimal: [
          'size-9.5 [transition-property:background-color,outline-offset,scale]',
          'motion-reduce:[transition-property:background-color]',
          'supports-[corner-shape:squircle]:rounded-[--spacing(4)]',
          'supports-[corner-shape:squircle]:[corner-shape:squircle]',
        ],
      },
    },
    icon: {
      className: 'media-button-icon',
      utilities: [
        'col-start-1 row-start-1 size-media-icon drop-shadow-[0_1px_0_var(--media-shadow-current-color)]',
        'transition-[opacity,scale] duration-150 ease-out',
        'motion-reduce:transition-opacity motion-reduce:duration-50',
      ],
    },
  },
});
