import { WistiaMedia } from '@videojs/media/dom/wistia';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

/**
 * `<wistia-video>` is Wistia's own `<wistia-player>`, normalized into a media by `WistiaMedia` and attached
 * to the player store here. Nothing else: the element a consumer writes is the element Wistia registers, so
 * there is no template, no inner player, and no chrome of ours to build around it.
 */
export class WistiaVideo extends MediaAttachMixin(WistiaMedia) {}
