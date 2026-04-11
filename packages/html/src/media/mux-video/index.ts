import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { MuxVideoMedia } from '@videojs/core/dom/media/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class MuxVideo extends MediaAttachMixin(CustomMediaElement('video', MuxVideoMedia)) {}
