import { ShakaAdapter } from '@videojs/shaka-video';

import { createMediaElement } from '../create-media-element';

export class ShakaVideo extends createMediaElement(ShakaAdapter) {}
