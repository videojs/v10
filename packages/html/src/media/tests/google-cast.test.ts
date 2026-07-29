import { ContextProvider } from '@videojs/element/context';
import type { Media } from '@videojs/media/dom';
import { GoogleCast } from '@videojs/media/dom/google-cast';
import { getMediaComponents } from '@videojs/media/dom/media-host';
import { HTMLVideoElementHost } from '@videojs/media/dom/video-host';
import { afterEach, describe, expect, it } from 'vitest';
import { mediaContext } from '../../player/context';
import { MediaElement } from '../../ui/media-element';
import { GoogleCastElement } from '../google-cast';

class TestMediaProvider extends MediaElement {
  readonly #provider = new ContextProvider(this, {
    context: mediaContext,
    initialValue: { media: null, setMedia: () => {} },
  });

  setMedia(media: Media | null) {
    this.#provider.setValue({ media, setMedia: () => {} });
  }
}

customElements.define('test-cast-provider', TestMediaProvider);
customElements.define('test-google-cast', GoogleCastElement);

function setup() {
  const host = new HTMLVideoElementHost();
  const provider = new TestMediaProvider();
  const el = new GoogleCastElement();

  provider.append(el);
  document.body.append(provider);

  return { host, provider, el };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('GoogleCastElement', () => {
  it('registers a GoogleCast component with the media host from context', () => {
    const { host, provider } = setup();

    provider.setMedia(host as unknown as Media);

    expect(getMediaComponents(host).get(GoogleCast)).toBeInstanceOf(GoogleCast);
  });

  it('leaves the component to the base class lazy getter', () => {
    // An own `component` field would shadow the getter and be initialized after
    // the base constructor — too late for a connected upgrade, where the media
    // context callback registers the component from within that constructor.
    expect(Object.getOwnPropertyNames(new GoogleCastElement())).not.toContain('component');
  });

  it('resolves the host from a media element host property', () => {
    const { host, provider } = setup();

    provider.setMedia({ host } as unknown as Media);

    expect(getMediaComponents(host).get(GoogleCast)).toBeInstanceOf(GoogleCast);
  });

  it('ignores media that is not a media host', () => {
    const { host, provider } = setup();

    provider.setMedia(host as unknown as Media);
    provider.setMedia(document.createElement('video') as unknown as Media);

    expect(getMediaComponents(host).get(GoogleCast)).toBeUndefined();
  });

  it('forwards attributes to the component', () => {
    const { host, provider, el } = setup();
    provider.setMedia(host as unknown as Media);

    el.setAttribute('receiver', 'APP_ID');
    el.setAttribute('content-type', 'application/x-mpegURL');
    el.setAttribute('stream-type', 'live');
    el.setAttribute('src', 'https://example.com/stream.m3u8');

    const component = getMediaComponents(host).get(GoogleCast)!;
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

    expect(getMediaComponents(host).get(GoogleCast)).toBeUndefined();
    expect(getMediaComponents(nextHost).get(GoogleCast)).toBeInstanceOf(GoogleCast);
  });

  it('removes the component when the element disconnects', () => {
    const { host, provider, el } = setup();
    provider.setMedia(host as unknown as Media);

    el.remove();

    expect(getMediaComponents(host).get(GoogleCast)).toBeUndefined();
  });

  it('removes the component on destroy', () => {
    const { host, provider, el } = setup();
    provider.setMedia(host as unknown as Media);

    el.destroy();

    expect(getMediaComponents(host).get(GoogleCast)).toBeUndefined();
  });
});
