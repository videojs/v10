/**
 * Mock simple video element registration — mirrors define/media/dash-video.ts.
 *
 * Exercises: element discovery via static tagName in define/media/*.ts.
 */
import { SimpleVideo } from '../../media/simple-video';

export class SimpleVideoElement extends SimpleVideo {
  static readonly tagName = 'simple-video';
}
