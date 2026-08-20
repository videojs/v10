import { expect, test } from '@playwright/test';
import { PlayerPage } from '../page-objects/player';

/**
 * SPF MediaSource attach + sourceclose-recovery smoke tests.
 *
 * Runs against the SPF engine page (`hls-video`) on every vite-*
 * project (Chromium, WebKit, Firefox). Two things under test:
 *
 * 1. The attach shape: the object URL rides a `<source>` child on every
 *    platform, not the `src` attribute. The HLS engine bakes
 *    `attachMediaSourceAsSourceElement` unconditionally because it composes
 *    `setupAirPlay`, whose native-HLS fallback has to stay a selectable
 *    sibling — `src`/`srcObject` would commit the element to the MSE resource
 *    and make any sibling inert.
 * 2. Sourceclose recovery: when the MSE attachment is torn down out from under
 *    the engine (the observable shape of an AirPlay handoff return or MMS
 *    eviction — the MediaSource fires `sourceclose`), `setupMediaSource`
 *    must rebuild a fresh MediaSource for the same source and playback
 *    must come back.
 *
 * Position restore across the rebuild is asserted in unit tests
 * (`setup-mediasource.test.ts`, `apply-start-position.test.ts`) and verified
 * on-device for true AirPlay — this simulation's `load()` races the position
 * snapshot, so exact-position assertions would be flaky here.
 */

const PAGE = '/pages/html-hls-video-fmp4.html';

/** Serializable snapshot of the media element's MSE attachment. */
interface AttachShape {
  airPlayCapable: boolean;
  srcAttr: string;
  sources: Array<{ type: string; src: string }>;
  readyState: number;
}

function readAttachShape(): AttachShape {
  const host = document.querySelector('hls-video');
  const video = (host?.shadowRoot?.querySelector('video') ?? host?.querySelector('video') ?? host) as HTMLVideoElement;
  return {
    airPlayCapable: 'WebKitPlaybackTargetAvailabilityEvent' in window,
    srcAttr: video.getAttribute('src') ?? '',
    sources: Array.from(video.querySelectorAll('source')).map((s) => ({ type: s.type, src: s.src })),
    readyState: video.readyState,
  };
}

/** The blob URL of the current MSE attachment, wherever it rides. */
function mseAttachmentOf(shape: AttachShape): string {
  if (shape.srcAttr.startsWith('blob:')) return shape.srcAttr;
  return shape.sources.find((s) => s.type === 'video/mp4' && s.src.startsWith('blob:'))?.src ?? '';
}

test.describe('SPF MediaSource attach + recovery', () => {
  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto(PAGE);
    await player.waitForMediaReady();
  });

  test('attaches MSE as a <source> child on every platform', async ({ page }) => {
    const shape = await page.evaluate(readAttachShape);

    // The MSE rides a <source> child so a native-HLS AirPlay fallback can
    // coexist as a second, selectable resource — no longer conditional on
    // ManagedMediaSource being available.
    expect(shape.sources.some((s) => s.type === 'video/mp4' && s.src.startsWith('blob:'))).toBe(true);
    // And the attach clears any bare `src`: a src attribute would win resource
    // selection outright and make every sibling inert.
    expect(shape.srcAttr).toBe('');

    if (shape.airPlayCapable) {
      // The setupAirPlay fallback source, carrying the manifest URL.
      expect(shape.sources.some((s) => s.type === 'application/x-mpegURL' && s.src.includes('.m3u8'))).toBe(true);
    }
  });

  test('rebuilds a fresh MediaSource when the attachment is torn down out from under the engine', async ({ page }) => {
    const before = await page.evaluate(readAttachShape);
    const beforeAttachment = mseAttachmentOf(before);
    expect(beforeAttachment).not.toBe('');

    // Simulate the UA killing the MSE attachment (AirPlay handoff return /
    // MMS eviction): removing the attachment + load() detaches the
    // MediaSource, which fires `sourceclose` — indistinguishable, from the
    // engine's side, from Safari doing it.
    await page.evaluate(() => {
      const host = document.querySelector('hls-video');
      const video = (host?.shadowRoot?.querySelector('video') ??
        host?.querySelector('video') ??
        host) as HTMLVideoElement;
      const mseSource = Array.from(video.querySelectorAll('source')).find(
        (s) => s.type === 'video/mp4' && s.src.startsWith('blob:')
      );
      if (mseSource) {
        mseSource.remove();
      } else {
        video.removeAttribute('src');
      }
      video.load();
    });

    // Recovery: a fresh MSE attachment (new object URL) appears and metadata
    // returns without any consumer-side src rewrite.
    await page.waitForFunction(
      (prev) => {
        const host = document.querySelector('hls-video');
        const video = (host?.shadowRoot?.querySelector('video') ??
          host?.querySelector('video') ??
          host) as HTMLVideoElement;
        const srcAttr = video.getAttribute('src') ?? '';
        const sourceChild = Array.from(video.querySelectorAll('source')).find(
          (s) => s.type === 'video/mp4' && s.src.startsWith('blob:')
        );
        const attachment = srcAttr.startsWith('blob:') ? srcAttr : (sourceChild?.src ?? '');
        return attachment !== '' && attachment !== prev && video.readyState >= 1;
      },
      beforeAttachment,
      { timeout: 20_000 }
    );

    const after = await page.evaluate(readAttachShape);
    expect(mseAttachmentOf(after)).not.toBe(beforeAttachment);
    // The rebuilt source is playable, not just attached.
    await player.play();
    await player.pause();
  });
});
