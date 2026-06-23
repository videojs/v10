import { audioFeatures, backgroundFeatures, type Media, videoFeatures } from '@videojs/core/dom';
import { afterEach, describe, expect, it } from 'vitest';

import { MediaAttachMixin } from '../../store/media-attach-mixin';
import { ControlsElement } from '../../ui/controls/controls-element';
import { MediaElement } from '../../ui/media-element';
import { createPlayer } from '../create-player';

function defineElement(tagName: string, Base: CustomElementConstructor): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, Base);
  }
}

function nextMicrotask(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve));
}

const { ProviderMixin } = createPlayer({ features: backgroundFeatures });

class TestPlayerElement extends ProviderMixin(MediaElement) {}

class TestMediaElement extends MediaAttachMixin(HTMLElement) {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.innerHTML = '<video controls></video>';
  }

  getMediaTarget(): Media | null {
    return this.target as Media | null;
  }

  get target(): HTMLVideoElement | null {
    return this.shadowRoot?.querySelector('video') ?? null;
  }
}

defineElement('test-create-player-provider', TestPlayerElement);
defineElement('test-create-player-media', TestMediaElement);
defineElement('test-create-player-controls', ControlsElement);

afterEach(() => {
  document.body.innerHTML = '';
});

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

  it('keeps native controls on fallback media without controls', async () => {
    const player = document.createElement('test-create-player-provider');
    const video = document.createElement('video');

    video.controls = true;
    player.append(video);
    document.body.append(player);

    await nextMicrotask();

    expect(video.controls).toBe(true);
  });

  it('removes native controls from fallback media when controls attach', async () => {
    const player = document.createElement('test-create-player-provider');
    const video = document.createElement('video');
    const controls = document.createElement('test-create-player-controls');

    video.controls = true;
    player.append(video, controls);
    document.body.append(player);

    await nextMicrotask();

    expect(video.controls).toBe(false);
  });

  it('restores native controls after all controls disconnect', async () => {
    const player = document.createElement('test-create-player-provider');
    const video = document.createElement('video');
    const firstControls = document.createElement('test-create-player-controls');
    const secondControls = document.createElement('test-create-player-controls');

    video.controls = true;
    player.append(video, firstControls, secondControls);
    document.body.append(player);

    await nextMicrotask();

    expect(video.controls).toBe(false);

    firstControls.remove();

    expect(video.controls).toBe(false);

    secondControls.remove();

    expect(video.controls).toBe(true);
  });

  it('keeps native controls on context-registered media without controls', async () => {
    const player = document.createElement('test-create-player-provider');
    const media = document.createElement('test-create-player-media') as TestMediaElement;

    document.body.append(player);
    player.append(media);

    await nextMicrotask();

    expect(media.target?.controls).toBe(true);
  });

  it('removes native controls from context-registered media when controls attach', async () => {
    const player = document.createElement('test-create-player-provider');
    const media = document.createElement('test-create-player-media') as TestMediaElement;
    const controls = document.createElement('test-create-player-controls');

    document.body.append(player);
    player.append(media, controls);

    await nextMicrotask();

    expect(media.target?.controls).toBe(false);
  });
});
