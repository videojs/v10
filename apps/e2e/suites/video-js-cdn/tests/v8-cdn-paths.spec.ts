import { expect, type Page, test } from '@playwright/test';

declare global {
  interface Window {
    videojs?: Videojs8;
    /** Whether `videojs` existed when the page's own code ran. */
    __sawVideojs?: boolean;
  }
}

/** The parts of the Video.js 8 global the assertions read. */
interface Videojs8 {
  VERSION: string;
  getPlayer: (id: string) => object | undefined;
  options: { languages: Record<string, Record<string, string>> };
}

interface V8Page {
  head: string;
  body: string;
  csp?: string;
}

const cdn = process.env.VIDEOJS_CDN_ORIGIN;
const site = process.env.VIDEOJS_PAGE_ORIGIN;
const unpkg = `${cdn}/video.js/dist/`;
const player = '<video id="player" class="video-js" controls width="320" height="180"></video>';
const nonce = 'r4nd0m';
const init = (attributes = '') => `<script ${attributes}>
  function __init() {
    window.__sawVideojs = typeof videojs === 'function';
    if (window.__sawVideojs) videojs('player');
  }
</script>`;
const loadFromPageCode = (src: string, attributes = '') => `<script ${attributes}>
  var script = document.createElement('script');
  script.src = '${src}';
  script.onload = __init;
  document.head.appendChild(script);
</script>`;

/** The v8 README embed: stylesheet, player script, a language file, then page code that calls `videojs()`. */
function readmeEmbed(base: string): V8Page {
  return {
    head: `<link rel="stylesheet" href="${base}video-js.min.css">`,
    body: `${player}
<script src="${base}video.min.js"></script>
<script src="${base}lang/es.js"></script>
${init()}
<script>__init();</script>`,
  };
}

async function openV8Page(page: Page, v8Page: V8Page): Promise<string[]> {
  const warnings: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });

  const params = new URLSearchParams({
    html: `<!doctype html><html><head>${v8Page.head}</head><body>${v8Page.body}</body></html>`,
  });

  if (v8Page.csp) params.set('csp', v8Page.csp);

  await page.goto(`${site}/page?${params}`);

  return warnings;
}

async function expectV8Player(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => Boolean(window.videojs?.getPlayer('player')))).toBe(true);
  expect(await page.evaluate(() => window.videojs?.VERSION)).toMatch(/^8\./);
}

async function expectV8Styles(page: Page): Promise<void> {
  await expect(page.locator('.vjs-big-play-button')).toHaveCSS('position', 'absolute');
}

test.describe('Video.js 8 CDN paths in video.js@10', () => {
  // URL prefixes that follow npm's `latest` tag.
  const latestPrefixes = {
    'unversioned unpkg URLs': unpkg,
    'unpkg @latest URLs': `${cdn}/video.js@latest/dist/`,
    'unversioned jsDelivr URLs': `${cdn}/npm/video.js/dist/`,
  };

  for (const [prefix, base] of Object.entries(latestPrefixes)) {
    test(`the v8 README embed keeps working through ${prefix}`, async ({ page }) => {
      const warnings = await openV8Page(page, readmeEmbed(base));

      await expectV8Player(page);
      await expectV8Styles(page);
      expect(await page.evaluate(() => window.__sawVideojs)).toBe(true);
      expect(await page.evaluate(() => Boolean(window.videojs?.options.languages.es))).toBe(true);
      expect(warnings.filter((warning) => warning.includes('Pin video.js@8'))).toHaveLength(1);
    });
  }

  const files = {
    'the alt build and its stylesheet': {
      head: `<link rel="stylesheet" href="${unpkg}alt/video-js-cdn.min.css">`,
      body: `${player}<script src="${unpkg}alt/video.novtt.min.js"></script>${init()}<script>__init();</script>`,
    },
    'the unminified build with data-setup': {
      head: `<link rel="stylesheet" href="${unpkg}video-js.css"><script src="${unpkg}video.js"></script>`,
      body: '<video id="player" class="video-js" controls width="320" height="180" data-setup="{}"></video>',
    },
  } satisfies Record<string, V8Page>;

  for (const [name, v8Page] of Object.entries(files)) {
    test(`${name} load Video.js 8`, async ({ page }) => {
      await openV8Page(page, v8Page);

      await expectV8Player(page);
      await expectV8Styles(page);
    });
  }

  const loadingMethods = {
    'with async': {
      head: `<link rel="stylesheet" href="${unpkg}video-js.min.css">${init()}`,
      body: `${player}<script async src="${unpkg}video.min.js" onload="__init()"></script>`,
    },
    'with defer': {
      head: `${init()}<script defer src="${unpkg}video.min.js"></script><script defer src="/init.js"></script>`,
      body: player,
    },
    'from page code': {
      head: '',
      body: `${player}${init()}${loadFromPageCode(`${unpkg}video.min.js`)}`,
    },
    'from page code after the load event': {
      head: '',
      body: `${player}${init()}<script>
  addEventListener('load', function () {
    var script = document.createElement('script');
    script.src = '${unpkg}video.min.js';
    script.onload = __init;
    document.head.appendChild(script);
  });
</script>`,
    },
    'under a nonce-based Content Security Policy': {
      csp: `script-src 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'none'`,
      head: '',
      body: `${player}
<script nonce="${nonce}" src="${unpkg}video.min.js"></script>
${init(`nonce="${nonce}"`)}
<script nonce="${nonce}">__init();</script>`,
    },
  } satisfies Record<string, V8Page>;

  for (const [method, v8Page] of Object.entries(loadingMethods)) {
    test(`page code finds videojs when the script loads ${method}`, async ({ page }) => {
      await openV8Page(page, v8Page);

      await expectV8Player(page);
      expect(await page.evaluate(() => window.__sawVideojs)).toBe(true);
    });
  }

  test('Video.js 8 still loads when a Content Security Policy blocks eval', async ({ page }) => {
    await openV8Page(page, {
      csp: `script-src 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'none'`,
      head: '',
      body: `${player}${init(`nonce="${nonce}"`)}${loadFromPageCode(`${unpkg}video.min.js`, `nonce="${nonce}"`)}`,
    });

    // The script tag fallback runs after the redirect's load event, so `__init` misses it; v8 still arrives.
    await expect.poll(() => page.evaluate(() => window.videojs?.VERSION)).toMatch(/^8\./);
  });

  test('URLs on an unrecognized CDN load Video.js 8 from jsDelivr', async ({ page }) => {
    await page.route('https://cdn.jsdelivr.net/npm/video.js@8/dist/**', async (route) => {
      const file = new URL(route.request().url()).pathname.replace('/npm/video.js@8/dist/', '');

      await route.fulfill({ response: await route.fetch({ url: `${cdn}/npm/video.js@8/dist/${file}` }) });
    });

    // cdnjs drops `dist/` from its paths.
    await openV8Page(page, readmeEmbed(`${cdn}/ajax/libs/video.js/10.0.0/`));

    await expectV8Player(page);
    expect(await page.evaluate(() => window.__sawVideojs)).toBe(true);
  });
});
