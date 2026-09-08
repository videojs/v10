import { DashAdapter } from '@videojs/dash-video';

import { createMediaElement } from '../create-media-element';

/** MPEG-DASH media element powered by dash.js and registered as `<dash-video>`. */
export class DashVideoElement extends createMediaElement(DashAdapter) {
  static readonly tagName = 'dash-video';
}
