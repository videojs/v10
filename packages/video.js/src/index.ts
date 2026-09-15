/**
 * The `video.js` root entry: a working video player from one import, plus coded stubs for the Video.js 8 module surface
 * so `import videojs from 'video.js'` fails with a `VJS8_LEGACY_*` code instead of "undefined is not a function".
 *
 * Importing this module registers `<video-player>`, `<video-skin>`, and the i18n elements — the same set the CDN
 * `video.js` bundle registers — so a developer arriving from a v8 snippet can keep `import 'video.js'`, drop the
 * factory call, and write the three tags. Anything more granular lives in `@videojs/html`.
 */
import '@videojs/html/i18n';
import '@videojs/html/video/player';
import '@videojs/html/video/skin';

export * from '@videojs/html';
export {
  default,
  getComponent,
  getPlayer,
  getPlugin,
  type LegacyVideojs,
  options,
  registerComponent,
  registerPlugin,
} from './videojs';
