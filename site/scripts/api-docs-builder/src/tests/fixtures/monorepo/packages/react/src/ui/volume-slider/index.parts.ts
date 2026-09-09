/**
 * Volume slider parts index — re-exports from slider base.
 *
 * Exercises: re-exported parts from another component.
 * - Root: local export (primary part, instantiates VolumeSliderCore)
 * - Thumb: re-exported from slider (gets slider's HTML elements + data-attrs)
 * - Track: re-exported from slider (gets slider's HTML elements)
 * - Preview: re-exported namespace from slider (expands to Preview.Root and Preview.Label)
 *
 * Re-exported parts are NEVER primary. Their element files and data-attrs
 * are resolved from the ORIGIN component (slider), not the consumer (volume-slider).
 *
 * Because there are re-exported parts, this always produces multi-part output
 * (no single-part fallback).
 */

export { Preview, Thumb, type ThumbProps, Track, type TrackProps } from '../slider/index.parts';
export { Root, type RootProps } from './root';
