import { DashAdapter } from '@videojs/dash-video';

import { createMediaElement } from '../create-media-element';

export class DashVideo extends createMediaElement(DashAdapter) {}
