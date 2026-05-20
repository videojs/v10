import type { Media } from '@videojs/core/dom';
import { YouTubeMedia, youTubeMediaDefaultProps } from '@videojs/core/dom/media/youtube';
import { isUndefined } from '@videojs/utils/predicate';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

const OBSERVED_ATTRIBUTES = [
  'src',
  'autoplay',
  'controls',
  'loop',
  'muted',
  'playsinline',
  'nocookie',
  'start',
] as const;

type ObservedAttribute = (typeof OBSERVED_ATTRIBUTES)[number];

const ATTR_TO_PROP: Record<ObservedAttribute, string> = {
  src: 'src',
  autoplay: 'autoplay',
  controls: 'controls',
  loop: 'loop',
  muted: 'muted',
  playsinline: 'playsinline',
  nocookie: 'nocookie',
  start: 'start',
};

function parseAttrValue(attr: ObservedAttribute, value: string | null): unknown {
  const defaultValue = (youTubeMediaDefaultProps as unknown as Record<string, unknown>)[attr];
  if (isUndefined(value) || value === null) return defaultValue;
  if (typeof defaultValue === 'boolean') return value !== 'false';
  if (typeof defaultValue === 'number') return Number(value) || defaultValue;
  return value;
}

export class YouTubeVideo extends MediaAttachMixin(HTMLElement) {
  static get observedAttributes(): string[] {
    return [...OBSERVED_ATTRIBUTES];
  }

  #media = new YouTubeMedia();
  #container: HTMLDivElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { display: block; height: 100%; overflow: hidden; border-radius: inherit; }
        div { width: 100%; height: 100%; position: relative; }
        div > iframe { width: 100%; height: 100%; border: none; display: block; }
      </style>
      <div></div>
    `;
    this.#container = shadow.querySelector('div')!;
  }

  // Register YouTubeMedia (not `this`) with the player store.
  getMediaTarget(): Media | null {
    return this.#media as unknown as Media;
  }

  connectedCallback() {
    // The mixin adds connectedCallback to the runtime prototype; call it to
    // register YouTubeMedia with the store context.
    // @ts-expect-error -- connectedCallback is on the mixin prototype, not HTMLElement's TS type
    super.connectedCallback?.();
    this.#media.attach(this.#container);
    // Sync any attributes that were set before connection.
    for (const attr of OBSERVED_ATTRIBUTES) {
      const value = this.getAttribute(attr);
      if (value !== null) this.#syncAttr(attr, value);
    }
  }

  disconnectedCallback() {
    // @ts-expect-error -- disconnectedCallback is on the mixin prototype, not HTMLElement's TS type
    super.disconnectedCallback?.();
    this.#media.detach();
  }

  attributeChangedCallback(name: string, _old: string | null, next: string | null) {
    this.#syncAttr(name as ObservedAttribute, next);
  }

  #syncAttr(attr: ObservedAttribute, value: string | null) {
    const prop = ATTR_TO_PROP[attr];
    if (!prop) return;
    (this.#media as unknown as Record<string, unknown>)[prop] = parseAttrValue(attr, value);
  }
}
