/**
 * Mock HTML audio skin element.
 *
 * Exercises: single skin per preset, skin detection via SkinElement inheritance.
 */
import { SkinElement } from '../skin-element';

export class AudioSkinElement extends SkinElement {
  static readonly tagName = 'audio-skin';
}
