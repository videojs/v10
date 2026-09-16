/**
 * Mock audio-only element registration — mirrors define/media/hls-audio.ts.
 *
 * Exercises: discovery of an audio element whose host mixin lives in another
 * workspace package.
 */
import { SpfAudioElement } from '../../media/spf-audio';
import { safeDefine } from '../../registration/safe-define';

safeDefine(SpfAudioElement);
