import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { DashMedia } from '@videojs/core/dom/media/dash';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class DashVideo extends MediaAttachMixin(CustomMediaElement('video', DashMedia)) {}
