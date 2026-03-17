import { ProxyMixin } from '../../core/media/proxy';

export const MediaProxyMixin = ProxyMixin(
  globalThis.HTMLVideoElement ?? class {},
  globalThis.HTMLMediaElement ?? class {},
  globalThis.EventTarget ?? class {}
);
