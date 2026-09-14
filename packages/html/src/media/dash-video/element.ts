import { DashAdapter } from '@videojs/dash-video';

import { createMediaElement, videoTarget } from '../create-media-element';

/**
 * MPEG-DASH media element powered by dash.js and registered as `<dash-video>`.
 *
 * @mediaType video
 * @mediaTarget video
 */
export class DashVideoElement extends createMediaElement({ Adapter: DashAdapter, target: videoTarget }) {
  static readonly tagName = 'dash-video';
}
