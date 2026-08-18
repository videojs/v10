import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { NativeHlsMedia } from '@videojs/media/dom/native-hls';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class NativeHlsVideo extends MediaAttachMixin(CustomMediaElement('video', NativeHlsMedia)) {}
