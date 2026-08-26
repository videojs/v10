/**
 * Mock HTML minimal video skin element.
 *
 * Exercises: multiple skins per preset, skin detection via SkinElement inheritance.
 */
import { SkinElement } from '../../presets/skin';

export class MinimalVideoSkinElement extends SkinElement {
  static readonly tagName = 'video-minimal-skin';
}
