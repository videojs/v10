import { styles } from 'vjsc/styles';

export default styles({
  file: 'sliders.css',
  layer: 'videojs.components',
  rules: {
    root: {
      className: 'media-volume-slider',
      utilities: [],
    },
    thumb: {
      className: 'media-volume-slider-thumb',
      utilities: 'opacity-100',
      variants: {
        default: [
          'size-3 scale-100 outline-4 -outline-offset-4 outline-transparent',
          'shadow-[0_0_0_1px_rgb(0_0_0/0.1),0_1px_3px_0_rgb(0_0_0/0.35),0_1px_2px_-1px_rgb(0_0_0/0.35)]',
          'hover:outline-current/15 hover:outline-offset-0 focus-visible:outline-current/15 focus-visible:outline-offset-0',
          'after:pointer-events-none after:absolute after:-inset-1 after:scale-50 after:rounded-[inherit] after:opacity-0',
          'after:shadow-[0_0_0_2px_currentColor] motion-safe:after:transition-[opacity,scale] motion-safe:after:duration-150 motion-safe:after:ease-out',
          'focus-visible:after:scale-100 focus-visible:after:opacity-100',
        ],
        minimal: [
          'size-3 scale-100 outline-2 -outline-offset-2 outline-transparent',
          'shadow-[0_0_0_1px_rgb(0_0_0/0.15),0_1px_3px_0_rgb(0_0_0/0.15),0_1px_2px_-1px_rgb(0_0_0/0.15)]',
          'focus-visible:outline-white focus-visible:outline-offset-2',
        ],
      },
    },
  },
});
