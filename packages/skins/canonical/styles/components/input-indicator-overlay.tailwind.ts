import { defineStyles } from '../define';

export default defineStyles({
  role: 'overlays',
  styles: {
    inputIndicatorOverlay: [
      'pointer-events-none absolute inset-0 grid grid-cols-3 items-center justify-items-center text-white',
    ],
  },
});
