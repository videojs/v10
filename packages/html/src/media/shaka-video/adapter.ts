import { CustomMediaElement } from '@videojs/media/dom';
import { ShakaAdapter } from '@videojs/shaka-video';

import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class ShakaVideo extends MediaAttachMixin(CustomMediaElement('video', ShakaAdapter)) {}
