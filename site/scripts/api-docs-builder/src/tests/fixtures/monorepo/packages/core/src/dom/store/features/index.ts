/**
 * Features index fixture.
 *
 * Exercises: feature discovery filters singular *Feature exports, ignores
 * plural *Features (feature bundles) from presets, and ignores namespace
 * re-exports (export * as features).
 */

export * as features from './feature.parts';
export * from './caption-style';
export * from './metadata';
export * from './orientation-lock';
export * from './playback';
export * from './poster';
export * from './presets';
export * from './volume';
