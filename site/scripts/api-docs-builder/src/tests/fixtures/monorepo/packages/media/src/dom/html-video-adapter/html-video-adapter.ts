/**
 * Mock video host base — mirrors the real html-video-adapter.ts.
 *
 * Exercises video-specific method extraction: requestFullscreen is added on
 * top of the shared html-media-adapter methods for video elements only. Also exercises
 * video-only native-property extraction (videoWidth) and a non-native helper
 * (isFullscreen) that must be filtered out of nativeProperties.
 */
import { HTMLMediaAdapter, mediaContentAttributes } from '../html-media-adapter';

export class HTMLVideoAdapter extends HTMLMediaAdapter {
  static readonly host = 'video';

  requestFullscreen(): Promise<void> {
    return Promise.resolve();
  }

  // Native HTMLVideoElement member — surfaces in nativeProperties (video only).
  get videoWidth(): number {
    return 0;
  }

  // Video.js-specific helper — NOT a native member, excluded.
  get isFullscreen(): boolean {
    return false;
  }
}

/** The content attributes a `<video>` accepts: the media ones plus its own. */
export const videoContentAttributes = {
  ...mediaContentAttributes,
  autoPictureInPicture: { type: Boolean },
  disablePictureInPicture: { type: Boolean },
  playsInline: { type: Boolean },
  poster: { type: String },
};
