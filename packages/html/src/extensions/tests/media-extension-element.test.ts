import { ContextProvider } from '@videojs/element/context';
import { getMediaExtensions, HTMLVideoElementHost, type Media, type MediaExtension } from '@videojs/media/dom';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { mediaContext } from '../../player/context';
import { UIElement } from '../../ui/ui-element';
import { MediaExtensionElement } from '../media-extension-element';

class FakeComponent implements MediaExtension {
  destroyed = false;
  destroy() {
    this.destroyed = true;
  }
}

class TestMediaProvider extends UIElement {
  readonly #provider = new ContextProvider(this, {
    context: mediaContext,
    initialValue: { media: null, registerMedia: () => () => {} },
  });

  setMedia(media: Media | null) {
    this.#provider.setValue({ media, registerMedia: () => () => {} });
  }
}

class TestMediaExtensionElement extends MediaExtensionElement<FakeComponent> {
  static readonly tagName = 'test-media-component';

  /**
   * Subclass field initializers run after the base constructor, which is the window the media context callback can fire
   * in during a custom element upgrade. Reading the component here proves it resolves that early.
   */
  readonly componentDuringFieldInit = this.component;

  /** Exposes the protected component for assertions. */
  get instance(): FakeComponent {
    return this.component;
  }

  protected createComponent(): FakeComponent {
    return new FakeComponent();
  }
}

customElements.define('test-media-component-provider', TestMediaProvider);
customElements.define(TestMediaExtensionElement.tagName, TestMediaExtensionElement);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('MediaExtensionElement', () => {
  it('resolves the component before subclass fields initialize', () => {
    const el = new TestMediaExtensionElement();

    expect(el.componentDuringFieldInit).toBeInstanceOf(FakeComponent);
    // Created once and reused, not re-created per access.
    expect(el.componentDuringFieldInit).toBe(el.instance);
  });

  it('registers the extension component with the media host from context', () => {
    const host = new HTMLVideoElementHost();
    const provider = new TestMediaProvider();
    const el = new TestMediaExtensionElement();

    provider.append(el);
    document.body.append(provider);
    provider.setMedia(host as unknown as Media);

    expect(getMediaExtensions(host).get(FakeComponent)).toBe(el.instance);
  });

  it('destroys the component when the element is destroyed', () => {
    const host = new HTMLVideoElementHost();
    const provider = new TestMediaProvider();
    const el = new TestMediaExtensionElement();

    provider.append(el);
    document.body.append(provider);
    provider.setMedia(host as unknown as Media);

    el.destroy();

    expect(el.instance.destroyed).toBe(true);
    expect(getMediaExtensions(host).get(FakeComponent)).toBeUndefined();
  });

  it('does not create a component when destroyed before use', () => {
    const el = new TestMediaExtensionElement();

    // `componentDuringFieldInit` already forced creation, so assert through a
    // subclass that never touches it.
    class Untouched extends MediaExtensionElement<FakeComponent> {
      created = 0;
      protected createComponent(): FakeComponent {
        this.created++;
        return new FakeComponent();
      }
    }
    customElements.define('test-media-component-untouched', Untouched);

    const untouched = new Untouched();

    untouched.destroy();

    expect(el.instance).toBeInstanceOf(FakeComponent);
    expect(untouched.created).toBe(0);
  });
});
