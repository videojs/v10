/**
 * Mock HTML background video skin element.
 *
 * Exercises: skin detection via *Skin*Element naming + static tagName.
 */
import { SkinElement } from '../skin-element';

export class BackgroundVideoSkinElement extends SkinElement {
  static readonly tagName = 'background-video-skin';
}
