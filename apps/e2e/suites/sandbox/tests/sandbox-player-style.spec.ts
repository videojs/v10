import { expect, type Page, test } from '@playwright/test';

const SANDBOX_BASE = process.env.SANDBOX_URL ?? 'http://localhost:5299';

/**
 * The player.style ports, and what each one's media is.
 *
 * Audio themes have no picture, so the checks that ask what paints over the media skip them. Live themes pin their own
 * source; everything else plays the progressive file.
 */
const PORTS: readonly { name: string; kind: 'video' | 'live' | 'audio'; fill?: boolean }[] = [
  { name: 'demuxed-2022', kind: 'video' },
  { name: 'halloween', kind: 'video' },
  { name: 'instaplay', kind: 'video' },
  { name: 'microvideo', kind: 'video' },
  { name: 'microvideo-live', kind: 'live' },
  { name: 'minimal', kind: 'video' },
  { name: 'minimal-live', kind: 'live' },
  { name: 'notflix', kind: 'video' },
  { name: 'reelplay', kind: 'video' },
  { name: 'sutro', kind: 'video' },
  { name: 'sutro-audio', kind: 'audio' },
  { name: 'tailwind-audio', kind: 'audio' },
  { name: 'vimeonova', kind: 'video' },
  // Winamp shows position with a thumb on a bare track, no fill layer, as the original does.
  { name: 'winamp', kind: 'video', fill: false },
  { name: 'x-mas', kind: 'video' },
  { name: 'yt', kind: 'video' },
];

/** Implementations that stand in for the hand-written markup on the same route, and the ports each one covers. */
const IMPLEMENTATIONS: readonly { impl: string | null; ports?: readonly string[] }[] = [
  { impl: null },
  { impl: 'react', ports: ['instaplay'] },
];

/**
 * What each kind of port puts in the media slot.
 *
 * A live port needs an element that can play HLS, and that element hosts the `<video>` in a shadow root. The skin lays
 * out the outer element, so that is the one these checks measure.
 */
const MEDIA_SELECTOR = {
  video: 'video, hls-video',
  live: 'video, hls-video',
  audio: 'audio, hls-audio',
} as const;

/**
 * How the media is laid out, read from the page.
 *
 * A media element left unsized lays out at its intrinsic dimensions and leaves the rest of the skin's box empty, which
 * no state assertion can see — hence the boxes rather than the player's own state.
 */
async function mediaLayout(page: Page, selector: string) {
  return page.evaluate((mediaSelector) => {
    const slotted = document.querySelector(mediaSelector);
    if (!slotted) throw new Error('The port rendered no media element.');

    const skin = slotted.parentElement;
    if (!skin) throw new Error('The media element is not inside the skin.');

    // An adapter element such as `hls-video` is `display: contents` and hosts the real media in a shadow root, so the
    // box that matters is the one that paints rather than the one the skin holds.
    const painted = slotted.shadowRoot?.querySelector('video, audio') ?? slotted;

    const box = painted.getBoundingClientRect();
    const frame = skin.getBoundingClientRect();

    return {
      media: { width: Math.round(box.width), height: Math.round(box.height) },
      frame: { width: Math.round(frame.width), height: Math.round(frame.height) },
    };
  }, selector);
}

/**
 * Every image still painting over the video, by class and rect.
 *
 * The poster is the one layer that has to get out of the way on playback, and a skin that reads its visibility state
 * without acting on it leaves the picture permanently hidden behind a still. Images are found through shadow roots,
 * since the HTML ports slot the media into skins that host one and the React port does not.
 */
async function imagesCoveringVideo(page: Page, selector: string) {
  return page.evaluate((mediaSelector) => {
    const slotted = document.querySelector(mediaSelector);
    if (!slotted) throw new Error('The port rendered no video element.');

    const target = (slotted.shadowRoot?.querySelector('video') ?? slotted).getBoundingClientRect();

    function collect(root: Document | ShadowRoot, found: HTMLImageElement[]): HTMLImageElement[] {
      for (const element of root.querySelectorAll('*')) {
        if (element instanceof HTMLImageElement) found.push(element);

        if (element.shadowRoot) collect(element.shadowRoot, found);
      }

      return found;
    }

    return collect(document, [])
      .filter((image) => {
        const style = getComputedStyle(image);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.01) return false;

        const box = image.getBoundingClientRect();
        const overlap =
          Math.max(0, Math.min(box.right, target.right) - Math.max(box.left, target.left)) *
          Math.max(0, Math.min(box.bottom, target.bottom) - Math.max(box.top, target.top));

        // Thumbnails and control artwork sit over a sliver at most; a poster covers the picture.
        return overlap > target.width * target.height * 0.5;
      })
      .map((image) => image.className || image.tagName.toLowerCase());
  }, selector);
}

/**
 * How much of the time slider's track the fill actually covers, as a fraction, beside the fraction it should.
 *
 * The fill layer reports progress only through `--media-slider-fill`, and a skin reads it in whichever way suits the
 * layer — a width, or a clip on a layer that stays full size. Both name the variable in the declaration that uses it,
 * so one selector finds either, and the rendered extent is read back rather than the declaration: a fill that reads
 * nothing renders at zero however plausible its markup looks.
 *
 * A theme with a volume slider has more than one fill and they are indistinguishable by markup, so the widest track
 * wins: a volume slider spans a fraction of what a time slider does.
 */
async function fillCoverage(page: Page): Promise<{ shown: number; expected: number } | null> {
  return page.evaluate(() => {
    const deep = (root: Document | ShadowRoot, found: Element[]): Element[] => {
      for (const element of root.querySelectorAll('*')) {
        found.push(element);

        if (element.shadowRoot) deep(element.shadowRoot, found);
      }

      return found;
    };

    const widest = deep(document, [])
      .filter(
        (element) =>
          element.tagName.toLowerCase() === 'media-slider-fill' ||
          String(element.className).includes('var(--media-slider-fill)')
      )
      .map((element) => ({ element, track: element.parentElement }))
      .filter((candidate): candidate is { element: Element; track: HTMLElement } => candidate.track !== null)
      .sort((a, b) => b.track.getBoundingClientRect().width - a.track.getBoundingClientRect().width)[0];
    if (!widest) return null;

    const { element: fill, track } = widest;

    const expected = Number.parseFloat(getComputedStyle(fill).getPropertyValue('--media-slider-fill')) / 100;
    if (Number.isNaN(expected)) return null;

    const box = fill.getBoundingClientRect();
    const trackWidth = track.getBoundingClientRect().width;
    if (trackWidth === 0) return null;

    // A clip leaves the box at full width, so the inset from the right is what the viewer is left seeing.
    const inset = /inset\(([^)]+)\)/.exec(getComputedStyle(fill).clipPath);
    const right = inset?.[1] ? (inset[1].trim().split(/\s+/)[1] ?? '0px') : null;
    const clipped =
      right === null ? 0 : right.endsWith('%') ? Number.parseFloat(right) / 100 : Number.parseFloat(right) / box.width;

    return { shown: (box.width * (1 - clipped)) / trackWidth, expected };
  });
}

for (const { impl, ports } of IMPLEMENTATIONS) {
  test.describe(`player.style ports${impl ? ` (${impl})` : ''}`, () => {
    for (const { name, kind, fill = true } of PORTS) {
      if (ports && !ports.includes(name)) continue;

      test(`${name} renders and plays`, async ({ page }) => {
        /*
         * `preload: none` is the whole point of the layout check below: with no media loaded there is no intrinsic
         * size, so the box the media gets is the skin's CSS and nothing else. Loaded media hides the bug instead —
         * a frame wider than the skin is capped by the page's `img, video { max-width: 100% }` reset and lands on the
         * right size for the wrong reason, while a narrow one stays small.
         */
        const params = new URLSearchParams({ panel: 'videojs', muted: '1', preload: 'none', autoplay: '0' });

        if (kind !== 'live') params.set('source', 'mp4-1');

        if (impl) params.set('impl', impl);

        await page.goto(`${SANDBOX_BASE}/player-style-${name}/?${params}`, { waitUntil: 'domcontentloaded' });

        const selector = MEDIA_SELECTOR[kind];
        const media = page.locator(selector).first();

        await expect(media).toBeAttached({ timeout: 15_000 });

        if (kind !== 'audio') {
          // The skin has to have been laid out before its box means anything.
          await expect.poll(() => mediaLayout(page, selector).then(({ frame }) => frame.width)).toBeGreaterThan(0);

          const layout = await mediaLayout(page, selector);

          // Both bounds matter. A media left unsized lays out at its intrinsic dimensions, which is as often larger
          // than the skin's box as smaller, and only one of those two shows up as an empty player part.
          expect(layout.media.width, 'the video matches the skin box').toBeCloseTo(layout.frame.width, -1);
          expect(layout.media.height, 'the video matches the skin box').toBeCloseTo(layout.frame.height, -1);
        }

        const play = page.getByRole('button', { name: /^(play|replay)$/i }).first();

        // The published live themes drop the play button, so their ports have none to find. Everything else has one,
        // and reaching playback through it is the point of the check.
        if (kind === 'live' && (await play.count()) === 0) {
          await media.evaluate((element: HTMLMediaElement) => element.play());
        } else {
          await expect(play, 'the skin exposes a play control').toBeVisible();

          // A trial click runs Playwright's actionability checks without pressing: it fails when another layer covers
          // the control, which is how an overlay with the wrong stacking or pointer events shows up.
          await play.click({ trial: true });
          await play.click();
        }

        await expect(media).toHaveJSProperty('paused', false, { timeout: 30_000 });
        await expect(media).toHaveJSProperty('readyState', 4, { timeout: 30_000 });
        // Live playback joins at the edge, so a fixed floor says nothing; what matters is that the clock moves.
        const started = await media.evaluate((element: HTMLMediaElement) => element.currentTime);

        await expect
          .poll(() => media.evaluate((element: HTMLMediaElement) => element.currentTime))
          .toBeGreaterThan(started);

        if (kind !== 'audio') {
          expect(await imagesCoveringVideo(page, selector), 'no image covers the playing video').toEqual([]);
        }

        // Live progress is the live window rather than a share of a duration, so only on-demand has a share to check.
        if (kind !== 'live' && fill) {
          await media.evaluate((element: HTMLMediaElement) => {
            element.pause();
            element.currentTime = element.duration / 2;
          });

          await expect
            .poll(() => fillCoverage(page).then((coverage) => (coverage === null ? 'none' : 'found')), {
              message: 'the time slider has a fill layer that reads --media-slider-fill',
            })
            .toBe('found');

          // Polled, not read once: several of these skins transition the fill, so it arrives over a few frames.
          await expect
            .poll(() => fillCoverage(page).then((coverage) => coverage && coverage.shown - coverage.expected), {
              message: 'the fill covers the share of the track it reports',
            })
            .toBeCloseTo(0, 1);
        }
      });
    }
  });
}
