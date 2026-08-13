// Deliberately the mixin's own module, not `../mux-video`: that barrel reaches
// `MuxVideoMedia`, and through it `SimpleHlsMedia` and the full HLS engine. The
// mixin alone carries no engine, which is what keeps this entry point
// audio-only. Same shape as `simple-hls-audio-only` importing its error surface
// from `../simple-hls`.
import { MuxMediaMixin } from '../mux-video/adapter';
import { SimpleHlsAudioOnlyMedia } from '../simple-hls-audio-only/media';

const MuxAudioMediaBase = MuxMediaMixin(SimpleHlsAudioOnlyMedia);

/**
 * The Mux Media over the SPF audio-only HLS engine.
 *
 * Same Mux surface as the video flavor — `src`, the structured `source`, and the
 * derived `contentData` all come from the shared mixin — over the subtractive
 * engine, so only the audio renditions of whatever the playback ID names are
 * fetched. That is the one place this diverges from the hls.js-backed
 * `<mux-audio>`, which runs the full engine and downloads video renditions it
 * never shows.
 *
 * `contentData` is kept rather than dropped, for the same reason its hls.js
 * counterpart has it: a playback ID played as audio is usually a *video* asset,
 * whose poster and storyboard exist and which an audio skin may well want. The
 * element ignores it either way. Mux publishes neither for a genuinely
 * audio-only asset, so those URLs 404 — see the known shortcoming on the video
 * flavor, which shares the derivation.
 */
export class MuxAudioMedia extends MuxAudioMediaBase {}
