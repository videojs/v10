import { HlsBackgroundVideoMediaMixin } from './adapter';
import { BackgroundVideoHost } from './host';

const HlsBackgroundVideoMediaBase = HlsBackgroundVideoMediaMixin(BackgroundVideoHost);

/**
 * The background-video Media, bound to a `<video>` through {@link BackgroundVideoHost}.
 *
 * That host is now composed from capability descriptors (see its doc comment for what that costs at today's
 * capability granularity), so this entry depends on `@videojs/media` where the hand-rolled host kept it out.
 *
 * No `MediaTracksMixin`, unlike `HlsVideoMedia`: the engine subtracts audio and text entirely and pins one video
 * rendition for the session, so there are no track lists for a consumer to project or switch between.
 */
export class HlsBackgroundVideoMedia extends HlsBackgroundVideoMediaBase {}
