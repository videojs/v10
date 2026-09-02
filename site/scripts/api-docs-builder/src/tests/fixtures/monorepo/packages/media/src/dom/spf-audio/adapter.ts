/**
 * Mock audio-only host — mirrors HlsAudioAdapter.
 *
 * Exercises: a host whose only mixin lives in a different workspace package
 * (spf), reached through that package's barrel file, composed onto the
 * audio host base.
 */
import { SpfAudioOnlyMixin } from '../../../../spf/src/hls';
import { HTMLAudioAdapter } from '../simple';

export class SpfAudioHost extends SpfAudioOnlyMixin(HTMLAudioAdapter) {}
