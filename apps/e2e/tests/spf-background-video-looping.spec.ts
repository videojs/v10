import { expect, type Page, test } from '@playwright/test';
import { MEDIA } from '../fixtures/resources';

/**
 * What an SPF-backed background looping video **must do**, stated as outcomes a
 * consumer could observe — deliberately not as the current implementation's
 * choices.
 *
 * The distinction matters because these are meant to survive a rewrite. The
 * engine today fills a 30s forward buffer, keeps two segments behind the
 * playhead, and refetches from the start of the source on each wrap. Not one of
 * those is a requirement of the use case: they are one way to satisfy
 * "keeps playing" and "doesn't grow without bound". So **nothing here asserts a
 * buffer size, an eviction policy, or a refetch strategy** — an implementation
 * that retained the whole clip and never refetched would pass every test in this
 * file, and so would one that evicted aggressively.
 *
 * What is inherent, and pinned:
 *
 * 1. It renders, and keeps rendering.
 * 2. It wraps indefinitely without stalling.
 * 3. Each pass plays the source through, in order.
 * 4. Buffered content never outruns the source.
 * 5. A source whose media encodes at a non-zero PTS still plays from 0.
 * 6. Changing source rebases the timeline rather than appending to the old one.
 *
 * (4) and (6) look like implementation trivia and are not. Under MSE
 * `"sequence"` mode an append lands wherever the last one ended rather than at
 * its declared time, so a re-planned segment **concatenates instead of
 * overwriting** and a source change **appends after the outgoing source** unless
 * the buffer is re-anchored. Both are silent — the buffer simply runs past the
 * source and playback repeats or stalls. Neither is a failure mode in
 * `"segments"` mode, which is why nothing pinned them before.
 *
 * @see apps/e2e/tests/spf-background-video.spec.ts — errors and rendition selection
 */

const HTML_PAGE = '/pages/html-hls-background-video.html';

const pageFor = (base: string, url: string) => `${base}?src=${encodeURIComponent(url)}`;

/** How often the in-page sampler records playback state. */
const SAMPLE_INTERVAL_MS = 100;

/** Playback progress below this across a window reads as "not advancing". */
const STALL_EPSILON_SECONDS = 0.01;

/** The longest a stalled playhead is tolerated before it counts as a stall. */
const MAX_STALL_MS = 2_000;

/**
 * Slack for comparing buffered extents against the source duration. Covers
 * segment-boundary rounding and the last partial frame; well under the 5s
 * segment size, so a duplicated segment cannot hide inside it.
 */
const DURATION_TOLERANCE_SECONDS = 1.5;

interface Sample {
  at: number;
  currentTime: number;
  duration: number;
  bufferedStart: number | null;
  bufferedEnd: number | null;
  rangeCount: number;
  paused: boolean;
}

type BackgroundVideoElement = HTMLElement & {
  video?: HTMLVideoElement | null;
  src?: string;
};

// These run inside the page, where `page.evaluate` serializes the function
// without its module scope — so each looks the element up for itself.

/** Frames exist and the clock is moving — playing, not merely loaded. */
async function waitForPlayback(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const video = (document.querySelector('hls-background-video') as { video?: HTMLVideoElement | null } | null)
        ?.video;
      return !!video && video.readyState >= 3 && video.currentTime > 0;
    },
    undefined,
    { timeout: 30_000 }
  );
}

/** Resolve once the engine has put anything in the buffer, whatever its position. */
async function waitForAnyBuffered(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const video = (document.querySelector('hls-background-video') as { video?: HTMLVideoElement | null } | null)
        ?.video;
      return !!video && video.buffered.length > 0;
    },
    undefined,
    { timeout: 30_000 }
  );
}

function readBufferedStart(): number | null {
  const media = document.querySelector('hls-background-video') as BackgroundVideoElement | null;
  const video = media?.video;
  if (!video || video.buffered.length === 0) return null;
  return video.buffered.start(0);
}

function startSampling(intervalMs: number): void {
  const store = window as unknown as { __samples?: Sample[]; __samplerId?: number };
  store.__samples = [];
  store.__samplerId = window.setInterval(() => {
    const media = document.querySelector('hls-background-video') as BackgroundVideoElement | null;
    const video = media?.video;
    if (!video) return;
    const { buffered } = video;
    store.__samples?.push({
      at: performance.now(),
      currentTime: video.currentTime,
      duration: video.duration,
      bufferedStart: buffered.length > 0 ? buffered.start(0) : null,
      bufferedEnd: buffered.length > 0 ? buffered.end(buffered.length - 1) : null,
      rangeCount: buffered.length,
      paused: video.paused,
    });
  }, intervalMs);
}

function stopSamplingAndRead(): Sample[] {
  const store = window as unknown as { __samples?: Sample[]; __samplerId?: number };
  if (store.__samplerId !== undefined) window.clearInterval(store.__samplerId);
  return store.__samples ?? [];
}

/**
 * A wrap is the playhead going backwards — the element's own loop, since nothing
 * in this composition seeks. Everything else is derived per-pass so a stall or a
 * skipped region is attributed to the pass it happened in.
 */
function analyze(samples: Sample[]) {
  const passes: Sample[][] = [[]];
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i];
    const previous = samples[i - 1];
    if (previous && sample.currentTime < previous.currentTime - STALL_EPSILON_SECONDS) passes.push([]);
    passes[passes.length - 1].push(sample);
  }

  let longestStallMs = 0;
  for (const pass of passes) {
    let stallStartedAt: number | null = null;
    for (let i = 1; i < pass.length; i++) {
      const advanced = pass[i].currentTime - pass[i - 1].currentTime > STALL_EPSILON_SECONDS;
      if (advanced || pass[i].paused) {
        stallStartedAt = null;
        continue;
      }
      stallStartedAt ??= pass[i - 1].at;
      longestStallMs = Math.max(longestStallMs, pass[i].at - stallStartedAt);
    }
  }

  const buffered = samples.filter((s) => s.bufferedEnd !== null);

  return {
    wraps: passes.length - 1,
    passes,
    longestStallMs,
    maxBufferedEnd: Math.max(...buffered.map((s) => s.bufferedEnd as number), 0),
    maxBufferedExtent: Math.max(...buffered.map((s) => (s.bufferedEnd as number) - (s.bufferedStart as number)), 0),
  };
}

test.describe('SPF background video — looping', () => {
  test('renders, and keeps rendering', async ({ page }) => {
    await page.goto(pageFor(HTML_PAGE, MEDIA.hlsShortLoop.url));

    // Setup, not subject: the element's template is `:host { position: relative }`
    // over an absolutely-positioned `<video>`, and it declares no `display` — so
    // it is an inline box that collapses to 0×0 until a consumer sizes it, and
    // the generated page ships no CSS. Sizing it is the consumer's job, so the
    // test does the consumer's job rather than assert the element does it.
    await page.addStyleTag({
      content: 'hls-background-video { display: block; width: 640px; height: 360px; }',
    });

    await waitForPlayback(page);

    // `readyState`/`currentTime` are not evidence of rendering: an element with
    // no layout box reports flawless playback while showing nothing. So this
    // asks the compositor instead — a real box, and two captures a moment apart
    // that differ. Comparing PNG bytes needs no decode, and the source is moving
    // content, so identical captures mean the picture is frozen.
    const element = page.locator('hls-background-video');
    const box = await element.boundingBox();
    expect(box, 'the element has no layout box — nothing can be on screen').not.toBeNull();
    expect(box?.width ?? 0).toBeGreaterThan(0);
    expect(box?.height ?? 0).toBeGreaterThan(0);

    const first = await element.screenshot();
    await page.waitForTimeout(1_000);
    const second = await element.screenshot();
    expect(Buffer.compare(first, second), 'the rendered picture never changed').not.toBe(0);
  });

  test('wraps repeatedly, plays each pass in order, and never outruns the source', async ({ page }) => {
    // Long by nature: pinning "loops indefinitely" needs more than one wrap of a
    // real source, and the shortest fixture available is 15s.
    test.setTimeout(150_000);

    const { url, durationSeconds } = MEDIA.hlsShortLoop;
    await page.goto(pageFor(HTML_PAGE, url));
    await waitForPlayback(page);

    await page.evaluate(startSampling, SAMPLE_INTERVAL_MS);
    await page.waitForTimeout(durationSeconds * 2.5 * 1_000);
    const samples = await page.evaluate(stopSamplingAndRead);

    const result = analyze(samples);

    // Soft so one property failing still reports the others — they describe the
    // same run, and knowing which of the three broke is most of the diagnosis.
    expect.soft(result.wraps, 'did not loop at least twice').toBeGreaterThanOrEqual(2);

    expect
      .soft(result.longestStallMs, `playback stalled for ${Math.round(result.longestStallMs)}ms`)
      .toBeLessThan(MAX_STALL_MS);

    // Every complete pass should cover the source: start near 0, reach near the
    // end. A pass that begins late or ends early means content was skipped.
    // First and last are partial by construction — sampling starts and stops
    // mid-pass — so only the interior ones are judged.
    for (const [index, pass] of result.passes.slice(1, -1).entries()) {
      const start = pass[0].currentTime;
      const end = pass[pass.length - 1].currentTime;
      expect
        .soft(start, `pass ${index + 1} began at ${start.toFixed(2)}s, not near 0`)
        .toBeLessThan(DURATION_TOLERANCE_SECONDS);
      expect
        .soft(end, `pass ${index + 1} ended at ${end.toFixed(2)}s, short of ${durationSeconds}s`)
        .toBeGreaterThan(durationSeconds - DURATION_TOLERANCE_SECONDS);
    }

    // The bound that matters, and the tripwire for a duplicated append: buffered
    // content cannot legitimately extend past the source. Under sequence mode a
    // re-planned segment concatenates rather than overwrites, which shows up
    // here first — as a buffer that keeps growing across wraps — long before it
    // is visible as repeated picture.
    expect
      .soft(result.maxBufferedEnd, 'buffered content ran past the end of the source')
      .toBeLessThan(durationSeconds + DURATION_TOLERANCE_SECONDS);
    expect
      .soft(result.maxBufferedExtent, 'buffered extent exceeded the whole source duration')
      .toBeLessThan(durationSeconds + DURATION_TOLERANCE_SECONDS);
  });

  test('a source whose media encodes at ~60s still buffers from 0', async ({ page }) => {
    // Was a recorded gap (`test.fail()`) while the composition appended in
    // `"segments"` mode with no relocation behavior: the buffer landed at the
    // media's native ~60s and the playhead at 0 found nothing. Sequence mode
    // closed it — the first group starts at 0 regardless of the media's encoded
    // PTS — so this is now an ordinary expectation.
    const { url, nativeStartSeconds } = MEDIA.hlsShortNonZeroPts;
    await page.goto(pageFor(HTML_PAGE, url));

    // Deliberately not `waitForPlayback`: this must fail on the wrong buffer
    // position, reported as a number, rather than time out on a stall 30s later.
    await waitForAnyBuffered(page);
    const bufferedStart = await page.evaluate(readBufferedStart);

    expect(
      bufferedStart,
      `buffer starts at the media's native ${nativeStartSeconds}s instead of the presentation's 0`
    ).toBeLessThan(1);

    await waitForPlayback(page);
  });

  test('changing source rebases the buffer instead of appending after the old one', async ({ page }) => {
    test.setTimeout(90_000);

    // Start on the *longer* asset so a failure to rebase is unmistakable: its
    // content would push the incoming short clip well past its own 15s.
    await page.goto(pageFor(HTML_PAGE, MEDIA.hlsFmp4.url));
    await waitForPlayback(page);

    await page.evaluate((url) => {
      const media = document.querySelector('hls-background-video') as BackgroundVideoElement | null;
      if (media) media.src = url;
    }, MEDIA.hlsShortLoop.url);

    await page.waitForFunction(
      (expected) => {
        const video = (document.querySelector('hls-background-video') as { video?: HTMLVideoElement | null } | null)
          ?.video;
        return !!video && Number.isFinite(video.duration) && Math.abs(video.duration - expected) < 2;
      },
      MEDIA.hlsShortLoop.durationSeconds,
      { timeout: 30_000 }
    );
    await waitForPlayback(page);

    const bufferedStart = await page.evaluate(readBufferedStart);
    expect(bufferedStart, 'the incoming source was appended after the outgoing one').toBeLessThan(
      DURATION_TOLERANCE_SECONDS
    );
  });
});
