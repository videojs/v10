/**
 * Mock video host base — mirrors the real html-video-adapter.ts.
 *
 * Exercises video-specific method extraction: requestFullscreen is added on
 * top of the shared html-media-adapter methods for video elements only. Also exercises
 * video-only native-property extraction (videoWidth) and a non-native helper
 * (isFullscreen) that must be filtered out of nativeProperties.
 */
import { HTMLMediaAdapter } from '../html-media-adapter';

export class HTMLVideoAdapter extends HTMLMediaAdapter {
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
