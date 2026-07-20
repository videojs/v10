import { afterEach, describe, expect, it } from 'vitest';

import { BackgroundVideo } from '../index';

afterEach(() => {
  document.body.innerHTML = '';
});

let tagCounter = 0;

function defineElement() {
  const tag = `test-background-video-${++tagCounter}`;
  customElements.define(tag, class extends BackgroundVideo {});
  return tag;
}

// innerHTML on a connected container so attributes are present when the constructor runs.
function create(tag: string, attrs: Record<string, string> = {}): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const attrStr = Object.entries(attrs)
    .map(
      ([k, v]) =>
        ` ${k}="${v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}"`
    )
    .join('');
  container.innerHTML = `<${tag}${attrStr}></${tag}>`;
  return container.querySelector(tag)!;
}

describe('BackgroundVideo', () => {
  describe('XSS prevention', () => {
    it('does not inject nodes when a whitelisted attribute value contains a quote breakout', () => {
      const tag = defineElement();
      const el = create(tag, { crossorigin: '" onerror="window.__xss=1' });
      const shadow = el.shadowRoot!;

      expect(shadow.querySelectorAll('[onerror]')).toHaveLength(0);
      expect(shadow.querySelectorAll('[onload]')).toHaveLength(0);
      expect((globalThis as any).__xss).toBeUndefined();
    });

    it('does not inject script elements when a whitelisted attribute contains angle brackets', () => {
      const tag = defineElement();
      const el = create(tag, { preload: '"><script>window.__xss=1</script><video x="' });
      const shadow = el.shadowRoot!;

      expect(shadow.querySelectorAll('script')).toHaveLength(0);
      expect((globalThis as any).__xss).toBeUndefined();
    });

    it('does not inject img elements via controlslist value', () => {
      const tag = defineElement();
      const el = create(tag, { controlslist: '"><img src=x onerror="window.__xss=1">' });
      const shadow = el.shadowRoot!;

      expect(shadow.querySelectorAll('img')).toHaveLength(0);
      expect((globalThis as any).__xss).toBeUndefined();
    });

    it('does not forward non-whitelisted attributes into the shadow template', () => {
      const tag = defineElement();
      const el = create(tag, { 'data-x': '" onerror="window.__xss=1' });
      const shadow = el.shadowRoot!;
      const video = shadow.querySelector('video')!;

      expect(video.hasAttribute('data-x')).toBe(false);
      expect(shadow.querySelectorAll('[onerror]')).toHaveLength(0);
    });

    it('preserves safe whitelisted attribute values correctly', () => {
      const tag = defineElement();
      // Test template generation directly — happy-dom may return null for IDL attrs (crossorigin) on shadow DOM elements.
      const Ctor = customElements.get(tag) as typeof BackgroundVideo;
      const attrs = {
        crossorigin: 'anonymous',
        preload: 'metadata',
        muted: '',
        loop: '',
        autoplay: '',
        playsinline: '',
        disableremoteplayback: '',
        disablepictureinpicture: '',
      };
      const container = document.createElement('div');
      container.innerHTML = (Ctor as any).getTemplateHTML(attrs);

      const video = container.querySelector('video')!;
      expect(video.getAttribute('crossorigin')).toBe('anonymous');
      expect(video.getAttribute('preload')).toBe('metadata');
    });

    it('serializes boolean (empty-string) attributes without a value', () => {
      const tag = defineElement();
      const el = create(tag);
      const video = el.shadowRoot!.querySelector('video')!;

      // muted/loop/autoplay/playsinline are set as booleans by the constructor.
      expect(video.hasAttribute('muted')).toBe(true);
      expect(video.hasAttribute('loop')).toBe(true);
      expect(video.hasAttribute('autoplay')).toBe(true);
      expect(video.hasAttribute('playsinline')).toBe(true);
    });
  });
});
