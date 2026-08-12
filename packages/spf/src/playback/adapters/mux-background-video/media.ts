import { HTMLVideoElementHost } from '@videojs/media/dom/video-host';
import { MuxBackgroundVideoMediaMixin } from './adapter';

const MuxBackgroundVideoMediaBase = MuxBackgroundVideoMediaMixin(HTMLVideoElementHost);

/**
 * The Mux background-video Media, bound to a `<video>` host.
 *
 * No `MediaTracksMixin`, unlike `SimpleHlsMedia`: the engine subtracts audio and
 * text entirely and pins one video rendition for the session, so there are no
 * track lists for a consumer to project or switch between.
 */
export class MuxBackgroundVideoMedia extends MuxBackgroundVideoMediaBase {}
