import { MediaApiMixin } from '../../core/media/api';

export type { MediaApiTarget } from '../../core/media/api';

export class MediaApi extends MediaApiMixin<HTMLMediaElement>(HTMLMediaElement, EventTarget) {}
export class VideoApi extends MediaApiMixin<HTMLVideoElement>(HTMLVideoElement, HTMLMediaElement, EventTarget) {}
export class AudioApi extends MediaApiMixin<HTMLAudioElement>(HTMLAudioElement, HTMLMediaElement, EventTarget) {}
