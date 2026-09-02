import { NativeHlsAdapter } from '@videojs/native-hls-video';

import { createMediaElement } from '../create-media-element';

export class NativeHlsVideo extends createMediaElement(NativeHlsAdapter) {}
