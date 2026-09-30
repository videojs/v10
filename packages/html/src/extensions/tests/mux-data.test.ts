// @vitest-environment jsdom

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
  it('registers when upgraded in a connected player that already has media', () => {
    const host = new HTMLVideoAdapter();
    const provider = new TestMediaProvider();

    document.body.append(provider);
    provider.setMedia(host as unknown as Media);

    provider.innerHTML = '<test-mux-data-upgrade></test-mux-data-upgrade>';
    customElements.define('test-mux-data-upgrade', class extends MuxDataExtension {});

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
});
