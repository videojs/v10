import { describe, expect, it } from 'vite-plus/test';

import { SpotifyAudio } from '../spotify-audio/media';

describe('SpotifyAudio', () => {
  it('hides the embed unless it is showing Spotify’s own chrome', () => {
    const template = SpotifyAudio.getTemplateHTML({ src: 'https://open.spotify.com/track/1301WleyT98MSxVHPZCA6M' });

    // Left visible, Spotify's own player UI shows through the skin drawn over it.
    // Asserted against the template because no DOM implementation the tests run
    // in resolves `:host` for a computed style.
    expect(template).toMatch(/:host\(:not\(\[controls\]\)\)\s*\{\s*display:\s*none\s*!important/);
  });
});
