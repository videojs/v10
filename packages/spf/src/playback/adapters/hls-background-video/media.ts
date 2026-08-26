import { HlsBackgroundVideoMediaMixin } from './adapter';
import { BackgroundVideoHost } from './host';

const HlsBackgroundVideoMediaBase = HlsBackgroundVideoMediaMixin(BackgroundVideoHost);

/**
 * The background-video Media, bound to a `<video>` through {@link BackgroundVideoHost}.
 *
 * That host carries the attached element and the four properties `attach` fixes, which is all this Media's surface
 * needs, and it is local — so this entry has no `@videojs/media` dependency.
 *
 * No `MediaTracksMixin`, unlike `HlsVideoMedia`: the engine subtracts audio and text entirely and pins one video
 * rendition for the session, so there are no track lists for a consumer to project or switch between.
 */
export class HlsBackgroundVideoMedia extends HlsBackgroundVideoMediaBase {}
