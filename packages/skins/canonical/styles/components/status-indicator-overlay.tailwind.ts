import { defineStyles } from '../define';

export default defineStyles({
  role: 'indicator',
  styles: {
    statusIndicatorOverlay: [
      'pointer-events-none absolute inset-0 grid grid-cols-3 items-center justify-items-center text-white',
    ],
  },
});
