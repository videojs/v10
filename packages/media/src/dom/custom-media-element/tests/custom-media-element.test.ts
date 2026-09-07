import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { HTMLAudioAdapter } from '../../html-audio-adapter';
import { HTMLVideoAdapter } from '../../html-video-adapter';
import { CustomMediaElement } from '../index';

afterEach(() => {
  document.body.innerHTML = '';
});

/** A video adapter that owns `src` and `streamType`, like an engine-backed one does. */
class TestVideoAdapter extends HTMLVideoAdapter {
  static readonly defaultProps = { src: '', streamType: 'unknown' };

  #src = '';
  #destroyed = false;

  get src() {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
  }

  get destroyed() {
    return this.#destroyed;
  }

  destroy() {
    this.#destroyed = true;
  }
}

/** A video adapter with its own primitive and object props, like `MuxVideoAdapter`. */
class TestVideoAdapterWithOptions extends HTMLVideoAdapter {
  static readonly defaultProps = { src: '', source: null, debug: false, latencyMode: 'normal', bufferSeconds: 30 };

  #src = '';
  #source: Record<string, unknown> | null = null;
  #metadata: Record<string, unknown> | undefined;
  #debug = false;
  #latencyMode = 'normal';
  #bufferSeconds = 30;

  get src() {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
  }

  get source() {
    return this.#source;
  }

  set source(value: Record<string, unknown> | null) {
    this.#source = value;
  }

  /** Property-only: not in `defaultProps`. */
  get metadata() {
    return this.#metadata;
  }

  set metadata(value: Record<string, unknown> | undefined) {
    this.#metadata = value;
  }

  get debug() {
    return this.#debug;
  }

  set debug(value: boolean) {
    this.#debug = value;
  }

  get latencyMode() {
    return this.#latencyMode;
  }

  set latencyMode(value: string) {
    this.#latencyMode = value;
  }

  get bufferSeconds() {
    return this.#bufferSeconds;
  }

  set bufferSeconds(value: number) {
    this.#bufferSeconds = value;
  }

  destroy() {}
}

class TestAudioAdapter extends HTMLAudioAdapter {
  static readonly defaultProps = { src: '' };

  destroy() {}
}

/** An embed adapter: no native element, so only its `defaultProps` become attributes. */
class TestEmbedAdapter extends EventTarget {
  static readonly host = 'iframe' as const;
  static readonly defaultProps = { src: '', autoplay: false, defaultMuted: false, muted: false, source: null };

  target: EventTarget | null = null;

  #src = '';
  #autoplay = false;
  #muted = false;

  get src() {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
  }

  get autoplay() {
    return this.#autoplay;
  }

  set autoplay(value: boolean) {
    this.#autoplay = value;
  }

  get muted() {
    return this.#muted;
  }

  set muted(value: boolean) {
    this.#muted = value;
  }

  attach(target: EventTarget | null) {
    this.target = target;
  }

  detach() {
    this.target = null;
  }

  destroy() {}
}

let tagCounter = 0;

function define<T extends CustomElementConstructor>(prefix: string, Ctor: T) {
  const tag = `${prefix}-${++tagCounter}`;

  customElements.define(tag, Ctor);

  return { Ctor, tag };
}

const defineVideoElement = () => define('test-video', CustomMediaElement(TestVideoAdapter));
const defineVideoElementWithOptions = () => define('test-video', CustomMediaElement(TestVideoAdapterWithOptions));
const defineAudioElement = () => define('test-audio', CustomMediaElement(TestAudioAdapter));
const defineEmbedElement = () => define('test-embed', CustomMediaElement(TestEmbedAdapter));

function create(def: { Ctor: new () => any; tag: string }) {
  const el = new def.Ctor();

  document.body.appendChild(el);

  return el;
}

describe('CustomMediaElement', () => {
  describe('shadow DOM', () => {
    it('renders the host element for the adapter', () => {
      const video = create(defineVideoElement());
      const audio = create(defineAudioElement());
      const embed = create(defineEmbedElement());

      expect(video.shadowRoot!.querySelector('video')).not.toBeNull();
      expect(audio.shadowRoot!.querySelector('audio')).not.toBeNull();
      expect(embed.shadowRoot!.querySelector('iframe')).not.toBeNull();
    });

    it('marks the inner element with a part named after the host', () => {
      const el = create(defineVideoElement());

      expect(el.shadowRoot!.querySelector('video')!.getAttribute('part')).toBe('video');
    });

    it('renders a custom template', () => {
      const Ctor = CustomMediaElement(TestEmbedAdapter, {
        template: (attrs) => `<iframe title="Embedded player" data-src="${attrs.src ?? ''}"></iframe>`,
      });
      const { tag } = define('test-embed', Ctor);
      const container = document.createElement('div');

      document.body.append(container);
      container.innerHTML = `<${tag} src="https://example.com/embed"></${tag}>`;

      const iframe = container.querySelector(tag)!.shadowRoot!.querySelector('iframe')!;

      expect(iframe.getAttribute('title')).toBe('Embedded player');
      expect(iframe.getAttribute('data-src')).toBe('https://example.com/embed');
    });

    it('lets a subclass replace the template through the static', () => {
      class Custom extends CustomMediaElement(TestVideoAdapter) {
        static template = () => '<video part="custom"></video>';
      }

      const el = create(define('test-video', Custom));

      expect(el.shadowRoot!.querySelector('video')!.getAttribute('part')).toBe('custom');
    });
  });

  describe('target', () => {
    it('returns the shadow DOM media element by default', () => {
      const el = create(defineVideoElement());

      expect(el.target).toBe(el.shadowRoot!.querySelector('video'));
    });

    it('prefers a slotted element with slot=media', () => {
      const el = create(defineVideoElement());
      const slotted = document.createElement('video');

      slotted.slot = 'media';
      el.appendChild(slotted);
      expect(el.target).toBe(slotted);
    });

    it('adopts a direct child of the host tag but not one nested in slotted content', () => {
      const el = create(defineVideoElement());
      const wrapper = document.createElement('div');

      wrapper.append(document.createElement('video'));
      el.append(wrapper);
      expect(el.target).toBe(el.shadowRoot!.querySelector('video'));

      const child = document.createElement('video');

      el.append(child);
      expect(el.target).toBe(child);
    });

    it('re-attaches the adapter when a slotted media element appears after construction', () => {
      const el = create(defineVideoElement());
      const shadowVideo = el.shadowRoot!.querySelector('video')!;
      const slottedVideo = document.createElement('video');

      slottedVideo.slot = 'media';
      el.appendChild(slottedVideo);
      el.shadowRoot!.querySelector('slot[name="media"]')!.dispatchEvent(new Event('slotchange', { bubbles: true }));

      el.volume = 0.5;
      expect(slottedVideo.volume).toBe(0.5);
      expect(shadowVideo.volume).toBe(1);
    });

    it('does not re-attach when the target has not changed', () => {
      const el = create(defineVideoElement());
      const shadowVideo = el.shadowRoot!.querySelector('video')!;

      el.shadowRoot!.querySelector('slot[name="media"]')!.dispatchEvent(new Event('slotchange', { bubbles: true }));

      el.volume = 0.5;
      expect(shadowVideo.volume).toBe(0.5);
    });
  });

  describe('observedAttributes', () => {
    it('observes the native attributes of a video host plus the adapter defaults', () => {
      const observed = defineVideoElement().Ctor.observedAttributes;

      for (const attr of ['autoplay', 'controls', 'crossorigin', 'loop', 'muted', 'preload', 'src', 'loading']) {
        expect(observed).toContain(attr);
      }

      for (const attr of ['poster', 'playsinline', 'autopictureinpicture', 'disablepictureinpicture']) {
        expect(observed).toContain(attr);
      }

      expect(observed).toContain('stream-type');
    });

    it('does not give an audio host video-only attributes', () => {
      const observed = defineAudioElement().Ctor.observedAttributes;

      expect(observed).toContain('controls');
      expect(observed).toContain('src');
      expect(observed).not.toContain('poster');
      expect(observed).not.toContain('playsinline');
      expect(observed).not.toContain('disablepictureinpicture');
      expect(observed).not.toContain('stream-type');
    });

    it('gives an embed exactly the primitive defaults of its adapter', () => {
      const observed = defineEmbedElement().Ctor.observedAttributes;

      expect(observed.sort()).toEqual(['autoplay', 'muted', 'src']);
    });

    it('derives one attribute per primitive default and none for objects or playback state', () => {
      const observed = defineVideoElementWithOptions().Ctor.observedAttributes;

      expect(observed).toContain('debug');
      expect(observed).toContain('latency-mode');
      expect(observed).toContain('buffer-seconds');
      expect(observed).not.toContain('source');
      expect(observed).not.toContain('metadata');
      expect(observed).not.toContain('volume');
      expect(observed).not.toContain('current-time');
    });
  });

  describe('attributes owned by the adapter', () => {
    it('write the adapter property, coerced by the type of its default', () => {
      const el = create(defineVideoElementWithOptions());

      el.setAttribute('src', 'https://example.com/video.m3u8');
      el.setAttribute('debug', '');
      el.setAttribute('latency-mode', 'low');
      el.setAttribute('buffer-seconds', '60');

      expect(el.adapter.src).toBe('https://example.com/video.m3u8');
      expect(el.adapter.debug).toBe(true);
      expect(el.adapter.latencyMode).toBe('low');
      expect(el.adapter.bufferSeconds).toBe(60);
    });

    it('reset the adapter property to its default when removed', () => {
      const el = create(defineVideoElementWithOptions());

      el.setAttribute('debug', '');
      el.setAttribute('latency-mode', 'low');
      el.setAttribute('buffer-seconds', '60');
      el.removeAttribute('debug');
      el.removeAttribute('latency-mode');
      el.removeAttribute('buffer-seconds');

      expect(el.adapter.debug).toBe(false);
      expect(el.adapter.latencyMode).toBe('normal');
      expect(el.adapter.bufferSeconds).toBe(30);
    });

    it('are written back by the property setter', () => {
      const el = create(defineVideoElementWithOptions());

      el.debug = true;
      el.latencyMode = 'low';
      el.src = 'https://example.com/video.m3u8';

      expect(el.hasAttribute('debug')).toBe(true);
      expect(el.getAttribute('latency-mode')).toBe('low');
      expect(el.getAttribute('src')).toBe('https://example.com/video.m3u8');
      expect(el.adapter.src).toBe('https://example.com/video.m3u8');
    });

    it('do not reach the inner element', () => {
      const el = create(defineVideoElement());

      el.setAttribute('stream-type', 'live');
      el.setAttribute('src', 'https://example.com/video.m3u8');

      expect(el.streamType).toBe('live');
      expect(el.target!.hasAttribute('stream-type')).toBe(false);
      expect(el.target!.hasAttribute('src')).toBe(false);
    });

    it('take the same value whether set through the attribute or the property', () => {
      const el = create(defineVideoElement());
      const set = vi.spyOn(TestVideoAdapter.prototype, 'src', 'set');

      el.src = 'a.m3u8';
      el.src = 'a.m3u8';
      el.setAttribute('src', 'b.m3u8');

      expect(set.mock.calls.map(([value]) => value)).toEqual(['a.m3u8', 'b.m3u8']);
      set.mockRestore();
    });
  });

  describe('native attributes of the host', () => {
    it('reach the adapter when it can set the property, so an engine can intercept them', () => {
      const el = create(defineVideoElement());

      el.setAttribute('muted', '');
      el.setAttribute('preload', 'none');
      el.setAttribute('controls', '');

      expect(el.muted).toBe(true);
      expect(el.target!.preload).toBe('none');
      expect(el.target!.hasAttribute('controls')).toBe(true);
    });

    it('are copied onto the inner element when the adapter has no property for them', () => {
      const el = create(defineVideoElement());

      el.setAttribute('controlslist', 'nodownload');
      el.setAttribute('loading', 'lazy');
      el.setAttribute('autopictureinpicture', '');

      expect(el.target!.getAttribute('controlslist')).toBe('nodownload');
      expect(el.target!.getAttribute('loading')).toBe('lazy');
      expect(el.target!.hasAttribute('autopictureinpicture')).toBe(true);

      el.removeAttribute('controlslist');
      expect(el.target!.hasAttribute('controlslist')).toBe(false);
    });

    it('reflect through a property either way', () => {
      const el = create(defineVideoElement());

      el.controls = true;
      el.controlsList = 'nodownload';
      el.crossOrigin = 'anonymous';

      expect(el.hasAttribute('controls')).toBe(true);
      expect(el.controls).toBe(true);
      expect(el.getAttribute('controlslist')).toBe('nodownload');
      expect(el.controlsList).toBe('nodownload');
      expect(el.getAttribute('crossorigin')).toBe('anonymous');
      expect(el.target!.getAttribute('crossorigin')).toBe('anonymous');

      el.crossOrigin = null;
      expect(el.hasAttribute('crossorigin')).toBe(false);
      expect(el.target!.hasAttribute('crossorigin')).toBe(false);
    });

    it('share the muted attribute between muted and defaultMuted', () => {
      const el = create(defineVideoElement());

      el.defaultMuted = true;
      expect(el.hasAttribute('muted')).toBe(true);
      expect(el.muted).toBe(true);

      el.muted = false;
      expect(el.hasAttribute('muted')).toBe(false);
      expect(el.defaultMuted).toBe(false);
    });

    it('are rendered into the template at construction, minus the ones the adapter owns', () => {
      const { tag } = defineVideoElement();
      const container = document.createElement('div');

      document.body.appendChild(container);
      container.innerHTML = `<${tag} src="video.m3u8" muted poster="poster.jpg" crossorigin="anonymous" class="player" volume="0.5"></${tag}>`;

      const video = container.querySelector(tag)!.shadowRoot!.querySelector('video')!;

      expect(video.getAttribute('poster')).toBe('poster.jpg');
      expect(video.getAttribute('crossorigin')).toBe('anonymous');
      expect(video.hasAttribute('src')).toBe(false);
      expect(video.hasAttribute('muted')).toBe(false);
      expect(video.hasAttribute('class')).toBe(false);
      expect(video.hasAttribute('volume')).toBe(false);
    });

    it('are not mirrored by an embed, whose template gets them all instead', () => {
      const Ctor = CustomMediaElement(TestEmbedAdapter, {
        template: (attrs) => `<iframe data-src="${attrs.src ?? ''}" data-muted="${'muted' in attrs}"></iframe>`,
      });
      const { tag } = define('test-embed', Ctor);
      const container = document.createElement('div');

      document.body.appendChild(container);
      container.innerHTML = `<${tag} src="https://example.com/embed" muted></${tag}>`;

      const el = container.querySelector(tag)! as any;
      const iframe = el.shadowRoot!.querySelector('iframe')!;

      expect(iframe.getAttribute('data-src')).toBe('https://example.com/embed');
      expect(iframe.getAttribute('data-muted')).toBe('true');
      expect(el.adapter.muted).toBe(true);

      el.setAttribute('autoplay', '');
      expect(el.adapter.autoplay).toBe(true);
      expect(iframe.hasAttribute('autoplay')).toBe(false);
    });

    it('do not include attributes a subclass observes for itself', () => {
      class Extended extends CustomMediaElement(TestVideoAdapter) {
        static get observedAttributes() {
          return [...super.observedAttributes, 'playback-id'];
        }
      }

      const el = create(define('test-video', Extended));

      el.setAttribute('playback-id', 'abc');
      expect(el.target!.hasAttribute('playback-id')).toBe(false);
    });
  });

  describe('adapter surface', () => {
    it('forwards getters, setters, and methods', () => {
      const el = create(defineVideoElement());

      expect(el.paused).toBe(true);
      expect(el.currentTime).toBe(0);
      expect(typeof el.play).toBe('function');
      expect(typeof el.load).toBe('function');

      el.volume = 0.5;
      expect(el.target!.volume).toBe(0.5);
    });

    it('forwards object properties without an attribute', () => {
      const el = create(defineVideoElementWithOptions());
      const source = { src: 'https://example.com/video.m3u8' };

      el.source = source;
      el.metadata = { title: 'x' };

      expect(el.source).toBe(source);
      expect(el.hasAttribute('source')).toBe(false);
      expect(el.adapter.metadata).toEqual({ title: 'x' });
    });

    it('leaves attach, detach, and destroy to the element', () => {
      const { Ctor } = defineVideoElement();

      for (const name of ['attach', 'detach', 'destroy']) {
        expect(Object.getOwnPropertyDescriptor(Ctor.prototype, name)).toBeUndefined();
      }
    });

    it('defines the surface on the prototype', () => {
      const { Ctor } = defineVideoElement();

      for (const name of ['autoplay', 'controls', 'controlsList', 'poster', 'src', 'streamType', 'play']) {
        expect(Object.getOwnPropertyDescriptor(Ctor.prototype, name), name).toBeDefined();
        expect(Object.getOwnPropertyDescriptor(Ctor, name), name).toBeUndefined();
      }
    });
  });

  describe('events', () => {
    it('forwards non-composed adapter events to the element', () => {
      const el = create(defineVideoElement());
      const handler = vi.fn();

      el.addEventListener('play', handler);
      el.target!.dispatchEvent(new Event('play'));

      expect(handler).toHaveBeenCalledOnce();
    });

    it('stops forwarding to a removed listener', () => {
      const el = create(defineVideoElement());
      const handler = vi.fn();

      el.addEventListener('play', handler);
      el.removeEventListener('play', handler);
      el.target!.dispatchEvent(new Event('play'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('delivers events dispatched on the element itself once', () => {
      const el = create(defineVideoElement());
      const handler = vi.fn();

      el.addEventListener('click', handler);
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      el.target!.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('lifecycle', () => {
    it('marks an embed with data-cross-origin-frame and leaves native hosts alone', () => {
      expect(create(defineEmbedElement()).hasAttribute('data-cross-origin-frame')).toBe(true);
      expect(create(defineVideoElement()).hasAttribute('data-cross-origin-frame')).toBe(false);
    });

    it('destroys the adapter a microtask after disconnecting', async () => {
      const el = create(defineVideoElement());

      el.remove();
      expect(el.destroyed).toBe(false);

      await Promise.resolve();
      expect(el.destroyed).toBe(true);
    });

    it('keeps the adapter alive across a synchronous move or with keep-alive', async () => {
      const moved = create(defineVideoElement());
      const kept = create(defineVideoElement());
      const container = document.createElement('div');

      document.body.appendChild(container);
      container.appendChild(moved);
      kept.setAttribute('keep-alive', '');
      kept.remove();
      await Promise.resolve();

      expect(moved.destroyed).toBe(false);
      expect(kept.destroyed).toBe(false);
    });
  });

  describe('XSS prevention', () => {
    // jsdom's shadow DOM parsing has quirks, so the template is rendered into a plain container.
    function renderTemplate(attrs: Record<string, string>) {
      const { Ctor } = defineVideoElement();
      const container = document.createElement('div');

      container.innerHTML = Ctor.template(attrs);

      return container;
    }

    it('does not inject nodes when poster contains a quote breakout attempt', () => {
      const container = renderTemplate({ poster: '"><script>alert(1)</script>' });

      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('video')!.getAttribute('poster')).toBe('"><script>alert(1)</script>');
    });

    it('does not inject elements when an attribute value contains angle brackets', () => {
      const container = renderTemplate({ crossorigin: '<img src=x onerror=alert(1)>' });

      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('video')!.getAttribute('crossorigin')).toBe('<img src=x onerror=alert(1)>');
    });
  });
});
