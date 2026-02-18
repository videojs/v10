import { CustomMediaMixin } from '../custom-media-element';

export class BackgroundVideo extends CustomMediaMixin(HTMLElement, { tag: 'video' }) {}
