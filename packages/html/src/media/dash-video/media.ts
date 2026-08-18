import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { DashMedia } from '@videojs/media/dom/dash';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class DashVideo extends MediaAttachMixin(CustomMediaElement('video', DashMedia)) {}
