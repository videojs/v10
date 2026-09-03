import { HlsVideoAdapter } from '@videojs/spf/hls-video';

import { createMediaElement } from '../create-media-element';

export class HlsVideo extends createMediaElement(HlsVideoAdapter) {}
