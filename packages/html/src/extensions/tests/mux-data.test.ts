import { ContextProvider } from '@videojs/element/context';
import { getMediaExtensions, HTMLVideoAdapter, type Media } from '@videojs/media/dom';
import { MuxDataExtension as MuxDataExtensionBase } from '@videojs/mux-data';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { mediaContext } from '../../player/context';
import { UIElement } from '../../ui/ui-element';
import { MuxDataExtension } from '../mux-data';

class TestMediaProvider extends UIElement {
  readonly #provider = new ContextProvider(this, {
    context: mediaContext,
    initialValue: { media: null, registerMedia: () => () => {} },
  });

  setMedia(media: Media | null) {
    this.#provider.setValue({ media, registerMedia: () => () => {} });
  }
}

customElements.define('test-mux-data-provider', TestMediaProvider);
customElements.define('test-mux-data', MuxDataExtension);

function setup() {
  const host = new HTMLVideoAdapter();
  const provider = new TestMediaProvider();
  const el = new MuxDataExtension();

  // Prevent the real Mux SDK from initializing (and beaconing) in tests.
  el.MuxDataSdk = undefined;

  provider.append(el);
  document.body.append(provider);

  return { host, provider, el };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MuxDataExtension', () => {
  it('registers when parsed into a connected player that already has media', () => {
    const host = new HTMLVideoAdapter();
    const provider = new TestMediaProvider();

    document.body.append(provider);
    provider.setMedia(host as unknown as Media);

    provider.innerHTML = '<test-mux-data></test-mux-data>';

    expect(getMediaExtensions(host).get(MuxDataExtensionBase)).toBeInstanceOf(MuxDataExtensionBase);
  });

  it('leaves the component to the base class lazy getter', () => {
    // An own `component` field would shadow the getter and be initialized after
    // the base constructor — too late for a connected upgrade, where the media
    // context callback registers the component from within that constructor.
    expect(Object.getOwnPropertyNames(new MuxDataExtension())).not.toContain('component');
  });
  it('registers a MuxDataExtension component with the media adapter from context', () => {
    const { host, provider } = setup();

    provider.setMedia(host as unknown as Media);

    expect(getMediaExtensions(host).get(MuxDataExtensionBase)).toBeInstanceOf(MuxDataExtensionBase);
  });

  it('forwards attributes to the component', () => {
    const { host, provider, el } = setup();

    provider.setMedia(host as unknown as Media);

    el.setAttribute('env-key', 'test-key');
    el.setAttribute('player-software-name', 'mux-video');
    el.setAttribute('player-init-time', '1234');
    el.setAttribute('debug', '');
    el.setAttribute('disable-cookies', '');

    const component = getMediaExtensions(host).get(MuxDataExtensionBase)!;

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

    expect(getMediaExtensions(host).get(MuxDataExtensionBase)!.metadata).toEqual(metadata);
  });

  it('removes the component when the element disconnects', () => {
    const { host, provider, el } = setup();

    provider.setMedia(host as unknown as Media);

    el.remove();

    expect(getMediaExtensions(host).get(MuxDataExtensionBase)).toBeUndefined();
  });
});
