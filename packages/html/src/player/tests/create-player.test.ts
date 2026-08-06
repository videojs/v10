import { audioFeatures, backgroundFeatures, metadataFeature, videoFeatures } from '@videojs/core/dom';
import { afterEach, describe, expect, it } from 'vitest';

import { MediaElement } from '../../ui/media-element';
import { createPlayer } from '../create-player';

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
    expect(result.ContainerMixin).toBeInstanceOf(Function);
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
    const { ContainerMixin } = createPlayer({ features: videoFeatures });
    const ContainerElement = ContainerMixin(MediaElement);

    expect(typeof ContainerElement).toBe('function');
    expect(ContainerElement.prototype).toBeDefined();
  });

  it('creates audio player with expected exports', () => {
    const result = createPlayer({ features: audioFeatures });

    expect(result.context).toBeDefined();
    expect(result.create).toBeInstanceOf(Function);
    expect(result.PlayerController).toBeDefined();
    expect(result.ProviderMixin).toBeInstanceOf(Function);
    expect(result.ContainerMixin).toBeInstanceOf(Function);
  });

  it('creates background player with expected exports', () => {
    const result = createPlayer({ features: backgroundFeatures });

    expect(result.context).toBeDefined();
    expect(result.create).toBeInstanceOf(Function);
    expect(result.PlayerController).toBeDefined();
    expect(result.ProviderMixin).toBeInstanceOf(Function);
    expect(result.ContainerMixin).toBeInstanceOf(Function);
  });

  it('maps selected feature inputs to kebab-cased reactive properties and attributes', async () => {
    const { ProviderMixin } = createPlayer({ features: [metadataFeature] });
    const ProviderElement = ProviderMixin(MediaElement);
    const tagName = 'test-metadata-provider';
    customElements.define(tagName, ProviderElement);

    const player = document.createElement(tagName) as InstanceType<typeof ProviderElement>;
    player.setAttribute('content-title', 'Attribute title');
    player.setAttribute('default-content-title', 'Fallback');
    document.body.append(player);

    expect(player.contentTitle).toBe('Attribute title');
    expect(player.store.contentTitle).toBe('Attribute title');
    expect(ProviderElement.observedAttributes).toContain('default-content-title');

    player.contentTitle = 'Property title';

    expect(player.contentTitle).toBe('Property title');
    expect(player.getAttribute('content-title')).toBe('Attribute title');

    await player.updateComplete;

    expect(player.store.contentTitle).toBe('Property title');

    player.setAttribute('content-title', '');
    await player.updateComplete;
    expect(player.store.contentTitle).toBe('');

    player.removeAttribute('content-title');
    await player.updateComplete;
    expect(player.store.contentTitle).toBe('Fallback');

    player.store.setContentTitle('Imperative title');

    expect(player.store.contentTitle).toBe('Imperative title');
    expect(player.contentTitle).toBeNull();
    expect(player.hasAttribute('content-title')).toBe(false);

    player.remove();
    document.body.append(player);

    expect(player.store.contentTitle).toBe('Imperative title');
  });

  it('leaves config attributes inert when their feature is absent', () => {
    const { ProviderMixin } = createPlayer({ features: backgroundFeatures });
    const ProviderElement = ProviderMixin(MediaElement);

    expect(ProviderElement.observedAttributes).not.toContain('content-title');
    expect(ProviderElement.prototype).not.toHaveProperty('contentTitle');
  });
});
