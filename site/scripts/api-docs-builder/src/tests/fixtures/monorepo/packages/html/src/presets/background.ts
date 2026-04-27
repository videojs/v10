/**
 * Mock HTML background preset.
 *
 * Exercises: intentionally incomplete barrel — only exports the feature bundle.
 * The skin and media element are NOT re-exported here, proving the pipeline
 * must scan the directory (define/background/) to find them.
 */
export { backgroundFeatures } from '../../../core/src/dom/store/features/presets';
