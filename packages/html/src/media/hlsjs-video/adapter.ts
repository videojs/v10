import { HlsJsAdapter } from '@videojs/hlsjs-video';

import { createMediaElement } from '../create-media-element';

export class HlsJsVideo extends createMediaElement(HlsJsAdapter) {}
