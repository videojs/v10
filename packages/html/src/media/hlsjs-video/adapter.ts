import { HlsJsAdapter } from '@videojs/hlsjs-video';
import { CustomMediaElement } from '@videojs/media/dom';

import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class HlsJsVideo extends MediaAttachMixin(CustomMediaElement('video', HlsJsAdapter)) {}
