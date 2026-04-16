import type { Constructor } from '@videojs/utils/types';

export const VideoCSSVars = {
  borderRadius: '--media-video-border-radius',
  objectFit: '--media-object-fit',
  objectPosition: '--media-object-position',
  captionTrackDuration: '--media-caption-track-duration',
  captionTrackDelay: '--media-caption-track-delay',
  captionTrackY: '--media-caption-track-y',
} as const;

export const AudioCSSVars = {} as const;

interface MediaHost extends EventTarget {
  readonly target: EventTarget | null;
  attach(target: EventTarget | null): void;
  detach(): void;
  destroy(): void;
  [key: string]: any;
}

type CustomMediaConstructor<T extends Constructor<MediaHost>> = Constructor<HTMLElement & InstanceType<T>> & {
  properties: Record<string, { type: any; attribute?: string }>;
  getTemplateHTML: (attrs: Record<string, string>) => string;
  shadowRootOptions: ShadowRootInit;
  readonly observedAttributes: string[];
};

/**
 * Server-safe stub. Returns a minimal class that extends HTMLElement (or a
 * bare class when HTMLElement is unavailable). No shadow DOM, no observers.
 */
export function CustomMediaElement<T extends Constructor<MediaHost>>(
  _tag: string,
  _MediaHost: T
): CustomMediaConstructor<T> {
  return class ServerCustomMedia extends (globalThis.HTMLElement ?? class {}) {
    static properties = {};
    static getTemplateHTML = () => '';
    static shadowRootOptions: ShadowRootInit = { mode: 'open' };
    static get observedAttributes() {
      return [];
    }
  } as any;
}
