import { ContextProvider } from '@videojs/element/context';
import { GoogleCastExtension as GoogleCastExtensionBase } from '@videojs/google-cast';
import { getMediaExtensions, HTMLVideoElementHost, type Media } from '@videojs/media/dom';
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
  const host = new HTMLVideoElementHost();
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
  it('registers a GoogleCastExtension component with the media host from context', () => {
    const { host, provider } = setup();

    provider.setMedia(host as unknown as Media);

    expect(getMediaExtensions(host).get(GoogleCastExtensionBase)).toBeInstanceOf(GoogleCastExtensionBase);
  });

  it('leaves the component to the base class lazy getter', () => {
    // An own `component` field would shadow the getter and be initialized after
    // the base constructor — too late for a connected upgrade, where the media
    // context callback registers the component from within that constructor.
    expect(Object.getOwnPropertyNames(new GoogleCastExtension())).not.toContain('component');
  });

  it('resolves the host from a media element host property', () => {
    const { host, provider } = setup();

    provider.setMedia({ host } as unknown as Media);

    expect(getMediaExtensions(host).get(GoogleCastExtensionBase)).toBeInstanceOf(GoogleCastExtensionBase);
  });

  it('ignores media that is not a media host', () => {
    const { host, provider } = setup();

    provider.setMedia(host as unknown as Media);
    provider.setMedia(document.createElement('video') as unknown as Media);

    expect(getMediaExtensions(host).get(GoogleCastExtensionBase)).toBeUndefined();
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

  it('moves the component when the media changes', () => {
    const { host, provider } = setup();
    const nextHost = new HTMLVideoElementHost();

    provider.setMedia(host as unknown as Media);
    provider.setMedia(nextHost as unknown as Media);

    expect(getMediaExtensions(host).get(GoogleCastExtensionBase)).toBeUndefined();
    expect(getMediaExtensions(nextHost).get(GoogleCastExtensionBase)).toBeInstanceOf(GoogleCastExtensionBase);
  });

  it('removes the component when the element disconnects', () => {
    const { host, provider, el } = setup();

    provider.setMedia(host as unknown as Media);

    el.remove();

    expect(getMediaExtensions(host).get(GoogleCastExtensionBase)).toBeUndefined();
  });

  it('removes the component on destroy', () => {
    const { host, provider, el } = setup();

    provider.setMedia(host as unknown as Media);

    el.destroy();

    expect(getMediaExtensions(host).get(GoogleCastExtensionBase)).toBeUndefined();
  });
});
