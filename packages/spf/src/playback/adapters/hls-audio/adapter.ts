import { HTMLAudioAdapter } from '@videojs/media/dom';

import { HlsAudioMixin } from './mixin';

export class HlsAudioAdapter extends HlsAudioMixin(HTMLAudioAdapter) {}
