import { defineStyles } from '../define';

export default defineStyles({
  role: 'overlays',
  styles: {
    bufferingIndicator: [
      'peer/buffering pointer-events-none absolute inset-0 z-10 hidden place-content-center text-white',
      'not-data-visible:[--media-spinner-animation:none] data-visible:grid',
    ],
    bufferingSpinnerIcon: 'size-media-icon drop-shadow-media-icon',
  },
});
