/**
 * Mock HTML video tailwind skin element.
 *
 * Exercises: tailwind skin exclusion — this should NOT appear in the output.
 */
import { SkinElement } from '../skin-element';

export class VideoSkinTailwindElement extends SkinElement {
  static readonly tagName = 'video-skin-tailwind';
}
