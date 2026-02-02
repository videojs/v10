import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Player
    'player/video': 'src/player/video.ts',
    // UI
    'ui/media-play-button': 'src/ui/media-play-button.ts',
    // Skin
    'skin/video-skin': 'src/skin/video-skin.ts',
    // Feature
    'feature/video': 'src/feature/video.ts',
    // Media
    'media/hls-video': 'src/media/hls-video.ts',
  },
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  dts: true,
});
