import { describe, expect, it } from 'vitest';
import { createPlaybackEngine } from '../playback-engine';

describe('createPlaybackEngine', () => {
  it('creates engine with state and owners', () => {
    const mediaElement = document.createElement('video');

    const engine = createPlaybackEngine({
      url: 'https://example.com/playlist.m3u8',
      mediaElement,
    });

    expect(engine.state).toBeDefined();
    expect(engine.owners).toBeDefined();
    expect(engine.destroy).toBeDefined();
    expect(typeof engine.destroy).toBe('function');

    engine.destroy();
  });

  it('initializes owners with mediaElement', () => {
    const mediaElement = document.createElement('video');

    const engine = createPlaybackEngine({
      url: 'https://example.com/playlist.m3u8',
      mediaElement,
    });

    expect(engine.owners.current.mediaElement).toBe(mediaElement);

    engine.destroy();
  });

  it('accepts custom configuration', () => {
    const mediaElement = document.createElement('video');

    const engine = createPlaybackEngine({
      url: 'https://example.com/playlist.m3u8',
      mediaElement,
      initialBandwidth: 3_000_000,
      preferredAudioLanguage: 'es',
    });

    // Engine should be created successfully with config
    expect(engine.state).toBeDefined();

    engine.destroy();
  });

  it('cleans up all orchestrations on destroy', () => {
    const mediaElement = document.createElement('video');

    const engine = createPlaybackEngine({
      url: 'https://example.com/playlist.m3u8',
      mediaElement,
    });

    // Should not throw
    expect(() => engine.destroy()).not.toThrow();
  });

  it('can be destroyed multiple times safely', () => {
    const mediaElement = document.createElement('video');

    const engine = createPlaybackEngine({
      url: 'https://example.com/playlist.m3u8',
      mediaElement,
    });

    engine.destroy();

    // Second destroy should not throw
    expect(() => engine.destroy()).not.toThrow();
  });
});
