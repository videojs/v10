import { describe, expect, it } from 'vitest';
import { cleanFeedHtml } from '../feedHtml';

const SITE = new URL('https://videojs.org/');

describe('cleanFeedHtml', () => {
  it('resolves relative URLs against the site', () => {
    const html = cleanFeedHtml('<p><a href="/docs/install">install</a> <img src="/_astro/shot.webp" alt=""></p>', SITE);

    expect(html).toContain('href="https://videojs.org/docs/install"');
    expect(html).toContain('src="https://videojs.org/_astro/shot.webp"');
  });

  it('leaves absolute URLs, fragments, and data URIs alone', () => {
    const html = cleanFeedHtml(
      '<a href="https://github.com/videojs/v10">repo</a><a href="#top">top</a><img src="data:image/gif;base64,AA" alt="">',
      SITE
    );

    expect(html).toContain('href="https://github.com/videojs/v10"');
    expect(html).toContain('href="#top"');
    expect(html).toContain('src="data:image/gif;base64,AA"');
  });

  it('resolves every candidate in a srcset', () => {
    const html = cleanFeedHtml('<img src="/a.webp" srcset="/a.webp 1x, /a@2x.webp 2x" alt="">', SITE);

    expect(html).toContain('srcset="https://videojs.org/a.webp 1x, https://videojs.org/a@2x.webp 2x"');
  });

  it('drops markup a feed reader cannot run', () => {
    const html = cleanFeedHtml(
      '<p>kept</p><script>alert(1)</script><style>p{color:red}</style><noscript>fallback</noscript>',
      SITE
    );

    expect(html).toBe('<p>kept</p>');
  });

  it('drops islands, which carry demos that cannot hydrate in a feed', () => {
    const html = cleanFeedHtml(
      '<p>kept</p><astro-island component-url="/player.js"><video></video></astro-island>',
      SITE
    );

    expect(html).toBe('<p>kept</p>');
  });

  it('unwraps slot placeholders but keeps their content', () => {
    const html = cleanFeedHtml('<figure><astro-slot><span>npm i</span></astro-slot></figure>', SITE);

    expect(html).toBe('<figure><span>npm i</span></figure>');
  });

  it('gives code blocks a background, since the feed carries no stylesheet', () => {
    const html = cleanFeedHtml('<pre><code>npm i</code></pre>', SITE);

    expect(html).toContain('background:#1e1d1d');
  });
});
