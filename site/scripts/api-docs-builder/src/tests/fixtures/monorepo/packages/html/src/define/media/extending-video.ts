/**
 * Mock extending video element registration — mirrors define/media/mux-video.ts.
 *
 * Exercises: element with a delegate that extends another delegate.
 */
import { ExtendingVideo } from '../../media/extending-video';

export class ExtendingVideoElement extends ExtendingVideo {
  static readonly tagName = 'extending-video';
}
