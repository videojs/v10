import { BackgroundVideoHost } from './host';
import { HlsBackgroundVideoMixin } from './mixin';

/**
 * The background-video Media, bound to a `<video>` through {@link BackgroundVideoHost}.
 *
 * That host carries the attached element and the four properties `attach` fixes, which is all this Media's surface
 * needs, and it is local — so this entry has no `@videojs/media` dependency.
 *
 * No `MediaTracksMixin`, unlike `HlsVideoAdapter`: the engine subtracts audio and text entirely and pins one video
 * rendition for the session, so there are no track lists for a consumer to project or switch between.
 */
export class HlsBackgroundVideoAdapter extends HlsBackgroundVideoMixin(BackgroundVideoHost) {}
