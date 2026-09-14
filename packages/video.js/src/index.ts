/**
 * The `video.js` root entry: everything `@videojs/html` exports, plus coded stubs for the Video.js 8 module surface so
 * `import videojs from 'video.js'` fails with a `VJS10_LEGACY_*` code instead of "undefined is not a function".
 */
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
