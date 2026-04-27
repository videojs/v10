/**
 * Mock HTML video skin element.
 *
 * Exercises: skin detection via SkinElement inheritance, tagName extraction.
 */
import { SkinElement } from '../skin-element';

export class VideoSkinElement extends SkinElement {
  static readonly tagName = 'video-skin';
}
