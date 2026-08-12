import { MuxBackgroundVideoMediaMixin } from './adapter';
import { BackgroundVideoHost } from './host';

const MuxBackgroundVideoMediaBase = MuxBackgroundVideoMediaMixin(BackgroundVideoHost);

/**
 * The Mux background-video Media, bound to a `<video>`.
 *
 * Over {@link BackgroundVideoHost} rather than `@videojs/media`'s
 * `HTMLVideoElementHost`: a background video reaches four of that host's members
 * and downloads the rest. It also keeps this entry free of `@videojs/media`, the
 * property `@videojs/spf/background-video` documents for itself.
 *
 * No `MediaTracksMixin`, unlike `SimpleHlsMedia`: the engine subtracts audio and
 * text entirely and pins one video rendition for the session, so there are no
 * track lists for a consumer to project or switch between.
 */
export class MuxBackgroundVideoMedia extends MuxBackgroundVideoMediaBase {}
