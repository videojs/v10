/**
 * Mock video host base — mirrors the real video-host.ts.
 *
 * Exercises video-specific method extraction: requestFullscreen is added on
 * top of the shared media-host methods for video elements only. Also exercises
 * video-only native-property extraction (videoWidth) and a non-native helper
 * (isFullscreen) that must be filtered out of nativeProperties.
 */
import { HTMLMediaElementHost } from './media-host';

export class HTMLVideoElementHost extends HTMLMediaElementHost {
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
