import { ProxyMixin } from '../../core/media/proxy';

export const VideoProxy = ProxyMixin(globalThis.HTMLVideoElement ?? class {});

export const AudioProxy = ProxyMixin(globalThis.HTMLAudioElement ?? class {});
