/**
 * Mock mixin-chain element registration — mirrors define/media/mux-video.ts.
 *
 * Exercises: element whose host is a mixin chain (call-expression extends).
 */
import { MixinVideo } from '../../media/mixin-video';

export class MixinVideoElement extends MixinVideo {
  static readonly tagName = 'mixin-video';
}
