import { features } from '@videojs/core/dom';
import { describe, expect, it } from 'vitest';

import { createPlayer } from '../create-player';

describe('createPlayer', () => {
  it('returns expected exports', () => {
    const result = createPlayer({ features: [...features.video] });

    expect(result.context).toBeDefined();
    expect(result.create).toBeInstanceOf(Function);
    expect(result.PlayerController).toBeDefined();
    expect(result.PlayerElement).toBeDefined();
    expect(result.PlayerMixin).toBeInstanceOf(Function);
    expect(result.ProviderMixin).toBeInstanceOf(Function);
    expect(result.ContainerMixin).toBeInstanceOf(Function);
  });

  it('create() returns a store instance', () => {
    const { create } = createPlayer({ features: [...features.video] });
    const store = create();

    expect(store.attach).toBeInstanceOf(Function);
    expect(store.subscribe).toBeInstanceOf(Function);
    expect(store.destroy).toBeInstanceOf(Function);
  });

  it('PlayerElement is a valid custom element class', () => {
    const { PlayerElement } = createPlayer({ features: [...features.video] });

    expect(typeof PlayerElement).toBe('function');
    expect(PlayerElement.prototype).toBeDefined();
  });
});
