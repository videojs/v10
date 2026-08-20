import { audioFeatures, backgroundFeatures, metadataFeature, type PopupGroup, videoFeatures } from '@videojs/core/dom';
import { ContextConsumer } from '@videojs/element/context';
import { afterEach, describe, expect, it } from 'vitest';

import { ContainerMixin } from '../../index';
import { MediaElement } from '../../ui/media-element';
import { createPlayer } from '../create-player';
import { popupGroupContext } from '../popup-group-context';

let tagCounter = 0;

function defineTestElement<Element extends CustomElementConstructor>(Base: Element): string {
  const tagName = `test-player-context-${tagCounter++}`;
  customElements.define(tagName, Base);
  return tagName;
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
    const ProviderElement = ProviderMixin(MediaElement);

    expect(typeof ProviderElement).toBe('function');
    expect(ProviderElement.prototype).toBeDefined();
  });

  it('ContainerMixin produces a valid custom element class', () => {
    const ContainerElement = ContainerMixin(MediaElement);

    expect(typeof ContainerElement).toBe('function');
    expect(ContainerElement.prototype).toBeDefined();
  });

  it('scopes popup coordination to container descendants', async () => {
    const { ProviderMixin } = createPlayer({ features: videoFeatures });

    class PopupGroupProbe extends MediaElement {
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

    const providerTag = defineTestElement(ProviderMixin(MediaElement));
    const containerTag = defineTestElement(ContainerMixin(MediaElement));
    const probeTag = defineTestElement(PopupGroupProbe);
    const provider = document.createElement(providerTag);
    const container = document.createElement(containerTag);
    const outsideProbe = document.createElement(probeTag) as PopupGroupProbe;
    const insideProbe = document.createElement(probeTag) as PopupGroupProbe;

    container.append(insideProbe);
    provider.append(outsideProbe, container);
    document.body.append(provider);

    await Promise.all([
      (provider as MediaElement).updateComplete,
      (container as MediaElement).updateComplete,
      outsideProbe.updateComplete,
      insideProbe.updateComplete,
    ]);

    expect(outsideProbe.popupGroup).toBeUndefined();
    expect(insideProbe.popupGroup).toBeDefined();
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
    const ProviderElement = ProviderMixin(MediaElement);
    const tagName = 'test-metadata-provider';
    customElements.define(tagName, ProviderElement);

    const player = document.createElement(tagName) as InstanceType<typeof ProviderElement>;
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
    const ProviderElement = ProviderMixin(MediaElement);
    const tagName = 'test-title-provider';
    customElements.define(tagName, ProviderElement);

    const player = document.createElement(tagName) as InstanceType<typeof ProviderElement>;
    document.body.append(player);

    // Nothing was installed over the native accessor, so this is still the tooltip.
    expect(Object.getOwnPropertyDescriptor(ProviderElement.prototype, 'title')).toBeUndefined();
    expect(ProviderElement.observedAttributes).not.toContain('title');

    player.title = 'Tooltip';
    await player.updateComplete;

    expect(player.getAttribute('title')).toBe('Tooltip');
    expect(player.store.title).toBe('');
  });

  it('leaves config attributes inert when their feature is absent', () => {
    const { ProviderMixin } = createPlayer({ features: backgroundFeatures });
    const ProviderElement = ProviderMixin(MediaElement);

    expect(ProviderElement.observedAttributes).not.toContain('content-title');
    expect(ProviderElement.prototype).not.toHaveProperty('contentTitle');
  });
});
