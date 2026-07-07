/**
 * Mock video host base — mirrors the real video-host.ts.
 *
 * Exercises video-specific method extraction: requestFullscreen is added on
 * top of the shared media-host methods for video elements only.
 */
import { HTMLMediaElementHost } from './media-host';

export class HTMLVideoElementHost extends HTMLMediaElementHost {
  requestFullscreen(): Promise<void> {
    return Promise.resolve();
  }
}
