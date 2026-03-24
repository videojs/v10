import { describe, expect, it } from 'vitest';
import { generateCdnCode } from '../cdn-code';

describe('generateCdnCode', () => {
  it('generates video preset CDN tags for html5-video', () => {
    expect(generateCdnCode('default-video', 'video', 'html5-video')).toEqual(
      `<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video.js"></script>`
    );
  });

  it('includes hls media bundle when renderer is hls', () => {
    expect(generateCdnCode('default-video', 'minimal-video', 'hls')).toEqual(
      `<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/video-minimal.js"></script>
<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/media/hls-video.js"></script>`
    );
  });

  it('generates background preset CDN tags', () => {
    expect(generateCdnCode('background-video', 'video', 'background-video')).toEqual(
      `<script type="module" src="https://cdn.jsdelivr.net/npm/@videojs/html/cdn/background.js"></script>`
    );
  });
});
