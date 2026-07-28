import { expect, test } from '@playwright/test';
import { PlayerPage } from '../page-objects/player';

/**
 * SPF MediaSource attach + liveness-recovery smoke tests.
 *
 * Runs against the SPF engine page (`simple-hls-video`) on every vite-*
 * project (Chromium, WebKit, Firefox). Two things under test:
 *
 * 1. The attach shape: WebKit's ManagedMediaSource attaches as a `<source>`
 *    child (the WebKit AirPlay pattern — an MSE `srcObject` would make any
 *    sibling native-HLS fallback source inert); everywhere else the object
 *    URL rides the `src` attribute.
 * 2. Liveness recovery: when the MSE attachment is torn down out from under
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

const PAGE = '/pages/html-simple-hls-video-fmp4.html';

/** Serializable snapshot of the media element's MSE attachment. */
interface AttachShape {
  hasMMS: boolean;
  airPlayCapable: boolean;
  srcAttr: string;
  sources: Array<{ type: string; src: string }>;
  readyState: number;
}

function readAttachShape(): AttachShape {
  const host = document.querySelector('simple-hls-video');
  const video = (host?.shadowRoot?.querySelector('video') ?? host?.querySelector('video') ?? host) as HTMLVideoElement;
  return {
    hasMMS: 'ManagedMediaSource' in window,
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

  test('attaches MSE as a source child under MMS, src attribute elsewhere', async ({ page }) => {
    const shape = await page.evaluate(readAttachShape);

    expect(mseAttachmentOf(shape)).not.toBe('');
    if (shape.hasMMS) {
      // WebKit/MMS: the MSE rides a <source> child so a native-HLS AirPlay
      // fallback can coexist as a second, selectable resource.
      expect(shape.sources.some((s) => s.type === 'video/mp4' && s.src.startsWith('blob:'))).toBe(true);
      if (shape.airPlayCapable) {
        // The setupAirPlay fallback source, carrying the manifest URL.
        expect(shape.sources.some((s) => s.type === 'application/x-mpegURL' && s.src.includes('.m3u8'))).toBe(true);
      }
    } else {
      expect(shape.srcAttr.startsWith('blob:')).toBe(true);
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
      const host = document.querySelector('simple-hls-video');
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
        const host = document.querySelector('simple-hls-video');
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
