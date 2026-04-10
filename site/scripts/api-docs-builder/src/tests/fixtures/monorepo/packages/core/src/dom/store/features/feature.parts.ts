/**
 * Short alias re-exports for features.
 *
 * Exercises: namespace re-export filtering — `export * as features from './feature.parts'`
 * in the index should NOT produce a feature entry named "features".
 */
export { playbackFeature as playback } from './playback';
export { volumeFeature as volume } from './volume';
