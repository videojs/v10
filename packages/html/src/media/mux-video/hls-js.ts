import { CustomMediaElement } from '@videojs/media/dom';
import { MuxMedia } from '@videojs/mux-video';

import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { MuxVideoMixin } from './mixin';

const MuxVideoBase = MuxVideoMixin(MediaAttachMixin(CustomMediaElement('video', MuxMedia)));

export class MuxVideo extends MuxVideoBase {}
