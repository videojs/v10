// @vitest-environment jsdom

import { ContextProvider } from '@videojs/element/context';
import { GoogleCastExtension as GoogleCastExtensionBase } from '@videojs/google-cast';
import { getMediaExtensions, HTMLVideoAdapter, type Media } from '@videojs/media/dom';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { mediaContext } from '../../player/context';
import { UIElement } from '../../ui/ui-element';
import { GoogleCastExtension } from '../google-cast';

class TestMediaProvider extends UIElement {
  readonly #provider = new ContextProvider(this, {
    context: mediaContext,
    initialValue: { media: null, registerMedia: () => () => {} },
  });

  setMedia(media: Media | null) {
    this.#provider.setValue({ media, registerMedia: () => () => {} });
  }
}

customElements.define('test-cast-provider', TestMediaProvider);
customElements.define('test-google-cast', GoogleCastExtension);

function setup() {
  const host = new HTMLVideoAdapter();
  const provider = new TestMediaProvider();
  const el = new GoogleCastExtension();

  provider.append(el);
  document.body.append(provider);

  return { host, provider, el };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('GoogleCastExtension', () => {
  it('registers when upgraded in a connected player that already has media', () => {
    const host = new HTMLVideoAdapter();
    const provider = new TestMediaProvider();

    document.body.append(provider);
    provider.setMedia(host as unknown as Media);

    provider.innerHTML = '<test-google-cast-upgrade></test-google-cast-upgrade>';
    customElements.define('test-google-cast-upgrade', class extends GoogleCastExtension {});

    expect(getMediaExtensions(host).get(GoogleCastExtensionBase)).toBeInstanceOf(GoogleCastExtensionBase);
  });

  it('forwards attributes to the component', () => {
    const { host, provider, el } = setup();

    provider.setMedia(host as unknown as Media);

    el.setAttribute('receiver', 'APP_ID');
    el.setAttribute('content-type', 'application/x-mpegURL');
    el.setAttribute('stream-type', 'live');
    el.setAttribute('src', 'https://example.com/stream.m3u8');

    const component = getMediaExtensions(host).get(GoogleCastExtensionBase)!;

    expect(component.receiver).toBe('APP_ID');
    expect(component.contentType).toBe('application/x-mpegURL');
    expect(component.streamType).toBe('live');
    expect(component.src).toBe('https://example.com/stream.m3u8');
    // Properties read back from the component.
    expect(el.receiver).toBe('APP_ID');
  });

  it('clears a component prop when its attribute is removed', () => {
    const { el } = setup();

    el.setAttribute('receiver', 'APP_ID');
    el.removeAttribute('receiver');

    expect(el.receiver).toBeUndefined();
  });
});
