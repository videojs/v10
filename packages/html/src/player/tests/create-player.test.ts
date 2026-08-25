import {
  audioFeatures,
  backgroundFeatures,
  features,
  metadataFeature,
  type PopupGroup,
  videoFeatures,
} from '@videojs/core/dom';
import { ContextConsumer } from '@videojs/element/context';
import { isFunction } from '@videojs/utils/predicate';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BackgroundVideo } from '../../media/background-video';
import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { ContainerElement } from '../../ui/container/container-element';
import { UIElement } from '../../ui/ui-element';
import { createPlayer } from '../create-player';
import { popupGroupContext } from '../popup-group-context';

let tagCounter = 0;

function defineTestElement<Element extends CustomElementConstructor>(Base: Element): string {
  const tagName = `test-player-context-${tagCounter++}`;
  customElements.define(tagName, Base);
  return tagName;
}

function createTestElement<Element extends HTMLElement>(tagName: string): Element {
  // SAFETY: Every caller passes a tag registered by defineTestElement or customElements.define with Element's class.
  return document.createElement(tagName) as Element;
}

describe('createPlayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns expected exports', () => {
    const result = createPlayer({ features: videoFeatures });

    expect(result.context).toBeDefined();
    expect(result.create).toBeInstanceOf(Function);
    expect(result.PlayerController).toBeDefined();
    expect(result.ProviderMixin).toBeInstanceOf(Function);
    expect(result).not.toHaveProperty('ContainerMixin');
  });

  it('create() returns a store instance', () => {
    const { create } = createPlayer({ features: videoFeatures });
    const store = create();

    expect(store.attach).toBeInstanceOf(Function);
    expect(store.subscribe).toBeInstanceOf(Function);
    expect(store.destroy).toBeInstanceOf(Function);
  });

  it('ProviderMixin produces a valid custom element class', () => {
    const { ProviderMixin } = createPlayer({ features: videoFeatures });
    const ProviderElement = ProviderMixin(UIElement);

    expect(isFunction(ProviderElement)).toBe(true);
    expect(ProviderElement.prototype).toBeDefined();
  });

  it('exports a valid ContainerElement class', () => {
    expect(isFunction(ContainerElement)).toBe(true);
    expect(ContainerElement.prototype).toBeDefined();
  });

  it('scopes popup coordination to container descendants', async () => {
    const { ProviderMixin } = createPlayer({ features: videoFeatures });

    class PopupGroupProbe extends UIElement {
      popupGroup: PopupGroup | undefined;

      constructor() {
        super();
        new ContextConsumer(this, {
          context: popupGroupContext,
          callback: (value) => {
            this.popupGroup = value;
          },
        });
      }
    }

    const providerTag = defineTestElement(ProviderMixin(UIElement));
    const containerTag = defineTestElement(ContainerElement);
    const probeTag = defineTestElement(PopupGroupProbe);
    const provider = createTestElement<UIElement>(providerTag);
    const container = createTestElement<ContainerElement>(containerTag);
    const outsideProbe = createTestElement<PopupGroupProbe>(probeTag);
    const insideProbe = createTestElement<PopupGroupProbe>(probeTag);

    container.append(insideProbe);
    provider.append(outsideProbe, container);
    document.body.append(provider);

    await Promise.all([
      provider.updateComplete,
      container.updateComplete,
      outsideProbe.updateComplete,
      insideProbe.updateComplete,
    ]);

    expect(outsideProbe.popupGroup).toBeUndefined();
    expect(insideProbe.popupGroup).toBeDefined();
  });

  it('keeps container registration identity-safe', async () => {
    const { ProviderMixin } = createPlayer({ features: backgroundFeatures });
    const PlayerElement = ProviderMixin(UIElement);
    const player = createTestElement<InstanceType<typeof PlayerElement>>(defineTestElement(PlayerElement));
    const first = document.createElement(defineTestElement(class extends ContainerElement {}));
    const second = document.createElement(defineTestElement(class extends ContainerElement {}));
    const video = document.createElement('video');

    first.append(video);
    player.append(first, second);
    document.body.append(player);

    await vi.waitFor(() => expect(player.store.target?.container).toBe(second));

    second.remove();
    await vi.waitFor(() => expect(player.store.target?.container).toBe(first));

    first.remove();
    await vi.waitFor(() => expect(player.store.target?.container).toBeNull());
  });

  it('upgrades parser-created containers under a connected player', async () => {
    const { ProviderMixin } = createPlayer({ features: backgroundFeatures });
    const PlayerElement = ProviderMixin(UIElement);
    const player = createTestElement<InstanceType<typeof PlayerElement>>(defineTestElement(PlayerElement));
    const containerTag = `test-late-container-${tagCounter++}`;

    player.innerHTML = `<${containerTag}><video></video></${containerTag}>`;
    document.body.append(player);

    expect(() => customElements.define(containerTag, class extends ContainerElement {})).not.toThrow();
    await vi.waitFor(() => expect(player.store.target?.container).toBeInstanceOf(ContainerElement));
  });

  it('keeps custom media registration identity-safe', async () => {
    const { ProviderMixin } = createPlayer({ features: backgroundFeatures });
    const PlayerElement = ProviderMixin(UIElement);
    const player = createTestElement<InstanceType<typeof PlayerElement>>(defineTestElement(PlayerElement));
    const mediaTag = defineTestElement(MediaAttachMixin(HTMLElement));
    const first = document.createElement(mediaTag);
    const second = document.createElement(mediaTag);

    player.append(first, second);
    document.body.append(player);

    await vi.waitFor(() => expect(player.store.target?.media).toBe(second));

    first.remove();
    expect(player.store.target?.media).toBe(second);

    second.remove();
    await vi.waitFor(() => expect(player.store.target).toBeNull());
  });

  it('tracks native media added, removed, and replaced after connection', async () => {
    const { ProviderMixin } = createPlayer({ features: backgroundFeatures });
    const PlayerElement = ProviderMixin(UIElement);
    const player = createTestElement<InstanceType<typeof PlayerElement>>(defineTestElement(PlayerElement));
    const first = document.createElement('video');
    const second = document.createElement('audio');

    document.body.append(player);
    expect(player.store.target).toBeNull();

    player.append(first);
    await vi.waitFor(() => expect(player.store.target?.media).toBe(first));

    first.replaceWith(second);
    await vi.waitFor(() => expect(player.store.target?.media).toBe(second));

    second.remove();
    await vi.waitFor(() => expect(player.store.target).toBeNull());
  });

  it('does not retain disconnected context media as a native fallback', async () => {
    const { ProviderMixin } = createPlayer({ features: backgroundFeatures });
    const PlayerElement = ProviderMixin(UIElement);
    const player = createTestElement<InstanceType<typeof PlayerElement>>(defineTestElement(PlayerElement));
    const background = document.createElement(defineTestElement(BackgroundVideo));
    const video = document.createElement('video');
    video.slot = 'media';

    background.append(video);
    player.append(background);
    document.body.append(player);

    await vi.waitFor(() => expect(player.store.target?.media).toBe(video));

    background.remove();
    expect(player.store.target).toBeNull();
  });

  it('creates audio player with expected exports', () => {
    const result = createPlayer({ features: audioFeatures });

    expect(result.context).toBeDefined();
    expect(result.create).toBeInstanceOf(Function);
    expect(result.PlayerController).toBeDefined();
    expect(result.ProviderMixin).toBeInstanceOf(Function);
    expect(result).not.toHaveProperty('ContainerMixin');
  });

  it('creates background player with expected exports', () => {
    const result = createPlayer({ features: backgroundFeatures });

    expect(result.context).toBeDefined();
    expect(result.create).toBeInstanceOf(Function);
    expect(result.PlayerController).toBeDefined();
    expect(result.ProviderMixin).toBeInstanceOf(Function);
    expect(result).not.toHaveProperty('ContainerMixin');
  });

  it('maps selected feature inputs to reactive properties and attributes', async () => {
    const { ProviderMixin } = createPlayer({ features: [metadataFeature] });
    const ProviderElement = ProviderMixin(UIElement);
    const tagName = 'test-metadata-provider';
    customElements.define(tagName, ProviderElement);

    const player = createTestElement<InstanceType<typeof ProviderElement>>(tagName);
    player.setAttribute('content-title', 'Attribute title');
    document.body.append(player);

    expect(player.contentTitle).toBe('Attribute title');
    expect(player.store.title).toBe('Attribute title');
    expect(ProviderElement.observedAttributes).toContain('content-title');

    player.contentTitle = 'Property title';

    expect(player.contentTitle).toBe('Property title');
    expect(player.getAttribute('content-title')).toBe('Attribute title');

    await player.updateComplete;

    expect(player.store.title).toBe('Property title');

    player.setAttribute('content-title', '');
    await player.updateComplete;
    expect(player.store.title).toBe('');

    player.removeAttribute('content-title');
    await player.updateComplete;
    expect(player.store.title).toBe('');
  });

  it('leaves the element its own `title`, which means the tooltip', async () => {
    const { ProviderMixin } = createPlayer({ features: [metadataFeature] });
    const ProviderElement = ProviderMixin(UIElement);
    const tagName = 'test-title-provider';
    customElements.define(tagName, ProviderElement);

    const player = createTestElement<InstanceType<typeof ProviderElement>>(tagName);
    document.body.append(player);

    // Nothing was installed over the native accessor, so this is still the tooltip.
    expect(Object.getOwnPropertyDescriptor(ProviderElement.prototype, 'title')).toBeUndefined();
    expect(ProviderElement.observedAttributes).not.toContain('title');

    player.title = 'Tooltip';
    await player.updateComplete;

    expect(player.getAttribute('title')).toBe('Tooltip');
    expect(player.store.title).toBe('');
  });

  it('applies orientation lock configuration through attributes and properties', async () => {
    const { ProviderMixin } = createPlayer({ features: [features.orientationLock] });
    const ProviderElement = ProviderMixin(UIElement);
    const tagName = 'test-orientation-lock-provider';
    customElements.define(tagName, ProviderElement);

    const player = createTestElement<InstanceType<typeof ProviderElement>>(tagName);
    player.setAttribute('orientation-lock-type', 'portrait');
    document.body.append(player);

    expect(player.store.orientationLockType).toBe('portrait');

    player.orientationLockType = 'natural';
    await player.updateComplete;

    expect(player.store.orientationLockType).toBe('natural');

    player.orientationLockType = undefined;
    await player.updateComplete;

    expect(player.store.orientationLockType).toBe('landscape');

    player.remove();
  });

  it('leaves config attributes inert when their feature is absent', () => {
    const { ProviderMixin } = createPlayer({ features: backgroundFeatures });
    const ProviderElement = ProviderMixin(UIElement);

    expect(ProviderElement.observedAttributes).not.toContain('content-title');
    expect(ProviderElement.prototype).not.toHaveProperty('contentTitle');
  });
});
