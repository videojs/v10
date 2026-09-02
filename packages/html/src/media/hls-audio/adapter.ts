import { HlsAudioAdapter } from '@videojs/spf/hls-audio';

import { createMediaElement } from '../create-media-element';

export class HlsAudio extends createMediaElement(HlsAudioAdapter, { tag: 'audio' }) {}
