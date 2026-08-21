import { WistiaMedia } from '@videojs/media/dom/wistia';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

/**
 * `<wistia-video>` is Wistia's own `<wistia-player>`, normalized into a media by `WistiaMedia` and attached
 * to the player store here. No template and no inner player: the element written is the element that plays.
 */
export class WistiaVideo extends MediaAttachMixin(WistiaMedia) {}
