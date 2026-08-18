import { ContextProvider } from '@videojs/element/context';
import type { Media } from '@videojs/media/dom';
import { getMediaComponents } from '@videojs/media/dom/media-host';
import { MuxData } from '@videojs/media/dom/mux';
import { HTMLVideoElementHost } from '@videojs/media/dom/video-host';
import { afterEach, describe, expect, it } from 'vitest';
import { mediaContext } from '../../player/context';
import { MediaElement } from '../../ui/media-element';
import { MuxDataElement } from '../mux-data';

class TestMediaProvider extends MediaElement {
  readonly #provider = new ContextProvider(this, {
    context: mediaContext,
    initialValue: { media: null, setMedia: () => {} },
  });

  setMedia(media: Media | null) {
    this.#provider.setValue({ media, setMedia: () => {} });
  }
}

customElements.define('test-mux-data-provider', TestMediaProvider);
customElements.define('test-mux-data', MuxDataElement);

function setup() {
  const host = new HTMLVideoElementHost();
  const provider = new TestMediaProvider();
  const el = new MuxDataElement();
  // Prevent the real Mux SDK from initializing (and beaconing) in tests.
  el.MuxDataSdk = undefined;

  provider.append(el);
  document.body.append(provider);

  return { host, provider, el };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MuxDataElement', () => {
  it('registers when parsed into a connected player that already has media', () => {
    const host = new HTMLVideoElementHost();
    const provider = new TestMediaProvider();
    document.body.append(provider);
    provider.setMedia(host as unknown as Media);

    provider.innerHTML = '<test-mux-data></test-mux-data>';

    expect(getMediaComponents(host).get(MuxData)).toBeInstanceOf(MuxData);
  });

  it('leaves the component to the base class lazy getter', () => {
    // An own `component` field would shadow the getter and be initialized after
    // the base constructor — too late for a connected upgrade, where the media
    // context callback registers the component from within that constructor.
    expect(Object.getOwnPropertyNames(new MuxDataElement())).not.toContain('component');
  });
  it('registers a MuxData component with the media host from context', () => {
    const { host, provider } = setup();

    provider.setMedia(host as unknown as Media);

    expect(getMediaComponents(host).get(MuxData)).toBeInstanceOf(MuxData);
  });

  it('forwards attributes to the component', () => {
    const { host, provider, el } = setup();
    provider.setMedia(host as unknown as Media);

    el.setAttribute('env-key', 'test-key');
    el.setAttribute('player-software-name', 'mux-video');
    el.setAttribute('player-init-time', '1234');
    el.setAttribute('debug', '');
    el.setAttribute('disable-cookies', '');

    const component = getMediaComponents(host).get(MuxData)!;
    expect(component.envKey).toBe('test-key');
    expect(component.playerSoftwareName).toBe('mux-video');
    expect(component.playerInitTime).toBe(1234);
    expect(component.debug).toBe(true);
    expect(component.disableCookies).toBe(true);
    // Properties read back from the component.
    expect(el.envKey).toBe('test-key');
  });

  it('forwards the metadata property to the component', () => {
    const { host, provider, el } = setup();
    provider.setMedia(host as unknown as Media);

    const metadata = { video_title: 'Test' };
    el.metadata = metadata;

    expect(getMediaComponents(host).get(MuxData)!.metadata).toEqual(metadata);
  });

  it('removes the component when the element disconnects', () => {
    const { host, provider, el } = setup();
    provider.setMedia(host as unknown as Media);

    el.remove();

    expect(getMediaComponents(host).get(MuxData)).toBeUndefined();
  });
});
