import { defineStyles } from '../define';

export default defineStyles({
  role: 'overlays',
  styles: {
    overlay: [
      'pointer-events-none absolute inset-0 rounded-[inherit]',
      '[background-image:linear-gradient(to_top,oklch(0_0_0/0.5),oklch(0_0_0/0.3)_25%,transparent)]',
    ],
  },
});
