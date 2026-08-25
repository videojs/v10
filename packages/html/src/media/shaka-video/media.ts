import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { ShakaMedia } from '@videojs/media/dom/shaka';

import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class ShakaVideo extends MediaAttachMixin(CustomMediaElement('video', ShakaMedia)) {}
