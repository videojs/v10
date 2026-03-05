import { audioFeatures, backgroundFeatures, videoFeatures } from '@videojs/core/dom';
import { describe, expect, it } from 'vitest';

import { MediaElement } from '../../ui/media-element';
import { createPlayer } from '../create-player';

describe('createPlayer', () => {
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
});
