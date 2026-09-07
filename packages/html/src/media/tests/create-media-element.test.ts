import { backgroundFeatures } from '@videojs/core/dom';
import { HTMLAudioAdapter, HTMLVideoAdapter } from '@videojs/media/dom';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { createPlayer } from '../../player/create-player';
import { createMediaElement } from '../create-media-element';

class FakeAdapter extends HTMLVideoAdapter {
  static defaultProps = { src: '' };

  #src = '';

  get src() {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
  }
}

class FakeAudioAdapter extends HTMLAudioAdapter {
  static defaultProps = { src: '' };

  #src = '';

  get src() {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
  }
}

class FakeEmbedAdapter extends EventTarget {
  static readonly host = 'iframe' as const;

  target: EventTarget | null = null;

  attach(target: EventTarget | null) {
    this.target = target;
  }

  detach() {
    this.target = null;
  }

  destroy() {}
}

let tagCounter = 0;

function defineTestElement<Element extends CustomElementConstructor>(Base: Element): string {
  const tagName = `test-create-media-element-${tagCounter++}`;

  customElements.define(tagName, Base);
  return tagName;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createMediaElement', () => {
  it("renders the adapter's host element in the shadow root and attaches the adapter to it", () => {
    const el = document.createElement(defineTestElement(createMediaElement(FakeAdapter)));

    document.body.append(el);

    const video = el.shadowRoot?.querySelector('video');

    expect(video).toBeInstanceOf(HTMLVideoElement);
    expect((el as unknown as { adapter: FakeAdapter }).adapter).toBeInstanceOf(FakeAdapter);
  });

  it('renders an <audio> for an audio adapter and mirrors attributes onto the adapter', () => {
    const el = document.createElement(defineTestElement(createMediaElement(FakeAudioAdapter)));

    document.body.append(el);
    el.setAttribute('src', 'https://example.com/audio.m3u8');

    expect((el as unknown as { adapter: FakeAudioAdapter }).adapter.src).toBe('https://example.com/audio.m3u8');
    expect(el.shadowRoot?.querySelector('audio')).toBeInstanceOf(HTMLAudioElement);
  });

  it('renders the template around an embed adapter and attaches to its iframe', () => {
    const Element = createMediaElement(FakeEmbedAdapter, {
      template: () => '<iframe part="iframe" title="Embedded player"></iframe>',
    });
    const el = document.createElement(defineTestElement(Element));

    document.body.append(el);

    const iframe = el.shadowRoot?.querySelector('iframe');

    expect(iframe?.getAttribute('title')).toBe('Embedded player');
    expect(el.shadowRoot?.querySelector('video')).toBeNull();
    expect((el as unknown as { adapter: FakeEmbedAdapter }).adapter.target).toBe(iframe);
  });

  it('registers with the surrounding player and releases on disconnect', async () => {
    const { PlayerElement } = createPlayer({ features: backgroundFeatures });
    const player = document.createElement(defineTestElement(PlayerElement)) as InstanceType<typeof PlayerElement>;
    const el = document.createElement(defineTestElement(createMediaElement(FakeAdapter)));

    player.append(el);
    document.body.append(player);

    await vi.waitFor(() => expect(player.store.target?.media).toBe(el));

    el.remove();
    await vi.waitFor(() => expect(player.store.target).toBeNull());
  });
});
