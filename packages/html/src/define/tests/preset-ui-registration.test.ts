import { describe, expect, it } from 'vitest';

describe('preset UI registration', () => {
  it('registers the container and UI without registering players', async () => {
    await import('../video/ui');
    await import('../video/minimal-ui');
    await import('../audio/ui');
    await import('../audio/minimal-ui');
    await import('../live-video/ui');
    await import('../live-video/minimal-ui');
    await import('../live-audio/ui');
    await import('../live-audio/minimal-ui');

    expect(customElements.get('media-container')).toBeDefined();
    expect(customElements.get('media-text')).toBeDefined();
    expect(customElements.get('media-menu')).toBeDefined();
    expect(customElements.get('media-menu-item')).toBeDefined();

    expect(customElements.get('video-player')).toBeUndefined();
    expect(customElements.get('audio-player')).toBeUndefined();
    expect(customElements.get('live-video-player')).toBeUndefined();
    expect(customElements.get('live-audio-player')).toBeUndefined();
  });
});
