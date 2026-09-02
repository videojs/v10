import { MuxVideoAdapter } from '@videojs/mux-video';

import { createMediaElement } from '../create-media-element';
import { MuxVideoMixin } from './mixin';

const MuxVideoBase = MuxVideoMixin(createMediaElement(MuxVideoAdapter));

export class MuxVideo extends MuxVideoBase {}
