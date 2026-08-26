// Deliberately the mixin's own module, not `../mux-video`: that barrel reaches
// `MuxVideoMedia`, and through it `HlsVideoMedia` and the full HLS engine. The
// mixin alone carries no engine, which is what keeps this entry point
// audio-only. Same shape as `hls-audio` importing its error surface
// from `../hls-video`.

import { HlsAudioMedia } from '../hls-audio/media';
import { MuxMediaMixin } from '../mux-video/adapter';

const MuxAudioMediaBase = MuxMediaMixin(HlsAudioMedia);

/**
 * The Mux Media over the SPF audio-only HLS engine.
 *
 * Same Mux surface as the video flavor — `src`, the structured `source`, and the derived `contentData` all come from
 * the shared mixin — over the subtractive engine, so only the audio renditions of whatever the playback ID names are
 * fetched. That is the one place this diverges from the hls.js-backed `<mux-audio>`, which runs the full engine and
 * downloads video renditions it never shows.
 *
 * `contentData` is kept rather than dropped, for the same reason its hls.js counterpart has it: a playback ID played as
 * audio is usually a _video_ asset, whose poster and storyboard exist and which an audio skin may well want. The
 * element ignores it either way. Mux publishes neither for a genuinely audio-only asset, so those URLs 404 — see the
 * known shortcoming on the video flavor, which shares the derivation.
 */
export class MuxAudioMedia extends MuxAudioMediaBase {}
