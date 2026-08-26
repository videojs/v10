/**
 * Mock background video registration — mirrors define/media/background-video.ts.
 *
 * Exercises: exclusion. BackgroundVideo uses MediaAttachMixin(HTMLElement)
 * without MediaPropsMixin. The builder should discover this file (it has
 * static tagName) but skip it because parseMixinChain returns null.
 * Its API reference is manually maintained in MDX (#1243).
 */
import { BackgroundVideo } from '../../media/background-video';

export class BackgroundVideoElement extends BackgroundVideo {
  static readonly tagName = 'background-video';
}
