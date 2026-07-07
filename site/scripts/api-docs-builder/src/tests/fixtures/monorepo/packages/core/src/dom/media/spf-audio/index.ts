/**
 * Mock audio-only host — mirrors SimpleHlsAudioOnlyMedia.
 *
 * Exercises: a host whose only mixin lives in a different workspace package
 * (spf), reached through that package's barrel file, composed onto the
 * audio host base.
 */
import { SpfAudioOnlyMediaMixin } from '../../../../../spf/src/hls';
import { HTMLAudioElementHost } from '../simple';

export class SpfAudioHost extends SpfAudioOnlyMediaMixin(HTMLAudioElementHost) {}
