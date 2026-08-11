import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { MuxMedia } from '@videojs/spf/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { MuxVideoMixin } from './mixin';

const MuxVideoBase = MuxVideoMixin(MediaAttachMixin(CustomMediaElement('video', MuxMedia)));

/**
 * `<mux-video>` over the SPF-backed Mux Media instead of the hls.js-backed one.
 *
 * Shares its name with the flavor in `./media` on purpose: the import path picks
 * the engine, and nothing else about the surface moves. Deliberately not exported
 * from this directory's barrel, so importing one flavor never pulls the other's
 * engine in with it.
 */
export class MuxVideo extends MuxVideoBase {}
