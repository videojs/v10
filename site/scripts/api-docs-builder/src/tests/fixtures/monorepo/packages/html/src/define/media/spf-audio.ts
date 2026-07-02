/**
 * Mock audio-only element registration — mirrors define/media/simple-hls-audio-only.ts.
 *
 * Exercises: discovery of an audio element whose host mixin lives in another
 * workspace package.
 */
import { SpfAudio } from '../../media/spf-audio';

export class SpfAudioElement extends SpfAudio {
  static readonly tagName = 'spf-audio';
}
