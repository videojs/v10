import { defineStyles, variants } from '../define';

export default defineStyles({
  role: 'indicator',
  styles: {
    bufferingIndicator: [
      'peer/buffering pointer-events-none absolute inset-0 z-10 hidden place-content-center text-white',
      'not-data-visible:[--media-spinner-animation:none] data-visible:grid',
    ],
    bufferingSpinnerIcon: variants({
      base: 'size-media-icon',
      variants: {
        default: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.15)]',
        minimal: 'drop-shadow-[0_1px_0_rgb(0_0_0/0.2)]',
      },
    }),
  },
});
