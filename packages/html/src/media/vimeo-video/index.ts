import type { Media } from '@videojs/core/dom';
import { VimeoMedia, vimeoMediaDefaultProps } from '@videojs/core/dom/media/vimeo';
import { isUndefined } from '@videojs/utils/predicate';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

const OBSERVED_ATTRIBUTES = [
  'src',
  'dnt',
  'autoplay',
  'autopause',
  'background',
  'byline',
  'color',
  'controls',
  'loop',
  'muted',
  'playsinline',
  'portrait',
  'quality',
  'responsive',
  'speed',
  'texttrack',
  'title',
  'transparent',
] as const;

type ObservedAttribute = (typeof OBSERVED_ATTRIBUTES)[number];

const ATTR_TO_PROP: Record<ObservedAttribute, string> = {
  src: 'src',
  dnt: 'dnt',
  autoplay: 'autoplay',
  autopause: 'autopause',
  background: 'background',
  byline: 'byline',
  color: 'color',
  controls: 'controls',
  loop: 'loop',
  muted: 'muted',
  playsinline: 'playsinline',
  portrait: 'portrait',
  quality: 'quality',
  responsive: 'responsive',
  speed: 'speed',
  texttrack: 'texttrack',
  title: 'title',
  transparent: 'transparent',
};

function parseAttrValue(attr: ObservedAttribute, value: string | null): unknown {
  const defaultValue = (vimeoMediaDefaultProps as unknown as Record<string, unknown>)[attr];
  if (isUndefined(value) || value === null) return defaultValue;
  if (typeof defaultValue === 'boolean') return value !== 'false';
  return value;
}

export class VimeoVideo extends MediaAttachMixin(HTMLElement) {
  static get observedAttributes(): string[] {
    return [...OBSERVED_ATTRIBUTES];
  }

  #media = new VimeoMedia();
  #container: HTMLDivElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { display: block; height: 100%; overflow: hidden; border-radius: inherit; }
        div { width: 100%; height: 100%; }
        div > iframe { width: 100%; height: 100%; border: none; display: block; }
      </style>
      <div></div>
    `;
    this.#container = shadow.querySelector('div')!;
  }

  // Register VimeoMedia (not `this`) with the player store.
  getMediaTarget(): Media | null {
    return this.#media as unknown as Media;
  }

  connectedCallback() {
    // The mixin adds connectedCallback to the runtime prototype; call it to
    // register VimeoMedia with the store context.
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
