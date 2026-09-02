import { MuxAudioAdapter } from '@videojs/mux-audio/spf';

import { createMediaElement } from '../create-media-element';
import { MuxAudioMixin } from './mixin';

const MuxAudioBase = MuxAudioMixin(createMediaElement(MuxAudioAdapter, { tag: 'audio' }));

/**
 * `<mux-audio>` over the SPF audio-only Mux Media instead of the hls.js-backed one.
 *
 * Shares its name with the flavor in `./hls-js` on purpose: the import path picks the engine, and nothing else about
 * the surface moves. Deliberately not exported from this directory's barrel, so importing one flavor never pulls the
 * other's engine in with it.
 *
 * The engine underneath is the subtractive audio-only one, so only the audio renditions of the playback ID are fetched
 * — unlike the hls.js-backed flavor, which runs the full engine and downloads video renditions it never plays.
 */
export class MuxAudio extends MuxAudioBase {}
