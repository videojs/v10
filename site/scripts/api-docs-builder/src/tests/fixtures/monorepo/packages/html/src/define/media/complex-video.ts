/**
 * Mock complex video element registration — mirrors define/media/hls-video.ts.
 *
 * Exercises: element discovery via static tagName in define/media/*.ts,
 * with a delegate that has JSDoc and overlapping native attributes.
 */
import { ComplexVideo } from '../../media/complex-video';

export class ComplexVideoElement extends ComplexVideo {
  static readonly tagName = 'complex-video';
}
