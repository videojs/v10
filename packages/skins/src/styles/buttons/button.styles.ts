import { styles } from 'vjsc/styles';

export default styles({
  file: 'buttons.css',
  rules: {
    root: {
      className: 'media-button',
      utilities: [
        'grid size-media-control min-h-0 shrink-0 touch-manipulation select-none place-items-center rounded-media-control border-0 bg-transparent p-0 text-center text-inherit [corner-shape:var(--media-control-corner-shape)] [text-shadow:inherit]',
        'cursor-pointer focus-ring-media',
        'will-change-[scale] duration-(--media-duration) ease-out [transition-property:background-color,color,outline-offset,scale]',
        'media-highlighted:highlight-media',
        'focus-visible:outline-media-ring focus-visible:outline-offset-2',
        'not-aria-disabled:active:scale-[0.97]',
        'motion-reduce:scale-100 motion-reduce:will-change-auto motion-reduce:[transition-property:background-color,color]',
        'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
      ],
      variants: {
        minimal: 'supports-[corner-shape:squircle]:rounded-2xl',
      },
    },
    icon: {
      className: 'media-button-icon',
      utilities: [
        'col-start-1 row-start-1 size-media-icon drop-shadow-media-icon',
        'transition-[opacity,scale] duration-(--media-duration) ease-out',
        'motion-reduce:transition-opacity',
      ],
    },
  },
});
