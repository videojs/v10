/**
 * Mock HTML video preset.
 *
 * Exercises: preset discovery, feature bundle export, skin exports,
 * tailwind skin exclusion. HTML presets do NOT export media elements
 * (the native <video> is implied by the preset name).
 */
export { videoFeatures } from '../../../core/src/dom/store/features/presets';
export { MinimalVideoSkinElement } from '../define/video/minimal-skin';
export { VideoSkinElement } from '../define/video/skin';
export { VideoSkinTailwindElement } from '../define/video/skin.tailwind';
