import tailwindcss from '@tailwindcss/vite';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['@vjs/react'],
  },
});
