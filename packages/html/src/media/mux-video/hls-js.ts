import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { MuxMedia } from '@videojs/media/dom/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { MuxVideoMixin } from './mixin';

const MuxVideoBase = MuxVideoMixin(MediaAttachMixin(CustomMediaElement('video', MuxMedia)));

export class MuxVideo extends MuxVideoBase {}
