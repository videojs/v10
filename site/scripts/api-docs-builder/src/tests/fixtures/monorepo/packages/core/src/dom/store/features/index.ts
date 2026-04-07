/**
 * Features index fixture.
 *
 * Exercises: feature discovery filters singular *Feature exports, ignores
 * plural *Features (feature bundles) from presets, and ignores namespace
 * re-exports (export * as features).
 */

export * as features from './feature.parts';
export * from './playback';
export * from './presets';
export * from './volume';
