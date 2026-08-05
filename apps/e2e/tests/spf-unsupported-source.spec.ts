import { expect, type Page, test } from '@playwright/test';
import { MEDIA } from '../fixtures/resources';
import { DATA_ATTRS, SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

/**
 * SPF unsupported-source error surfacing, end to end: engine detection →
 * adapter `error` → the player store's error feature → the dialog.
 *
 * `error-dialog.spec.ts` covers the dialog itself, but fakes the error with
 * `Object.defineProperty(video, 'error')`. Nothing there exercises a real
 * engine verdict, which is what the PRD's *Error Notices* ask is about: a
 * source the SPF engine genuinely cannot play should fail visibly instead of
 * stalling in silence.
 *
 * The source under test is an MPEG-TS ladder with no fMP4 rendition — the
 * PRD's exact legacy-format scenario. The engine derives `video/mp2t` from the
 * segment extension (no `EXT-X-MAP`), `canPlayTrack` prunes every video
 * rendition as unplayable, and `track-switching` reports the verdict for a
 * type that has renditions but none selectable.
 *
 * Assertions are split deliberately: the SVTA code is the engine's contract
 * and is asserted exactly, while dialog copy is matched loosely. That copy is
 * a known-imperfect surface — an SVTA code has no `MediaError` translation, so
 * the dialog shows the engine's own unlocalized `message` verbatim. Pinning
 * the exact string here would make this spec fail on the localization work
 * that fixes it.
 *
 * @see internal/design/spf/features/errors.md
 */

/** SVTA 2 [Playback] 011 — a source with video renditions, none of them playable. */
const SVTA_NO_SUPPORTED_VIDEO_TRACK = 2011;

/** SVTA 1 [Media Content] 004 — the per-rendition cause behind the verdict. */
const SVTA_UNSUPPORTED_VIDEO_FORMAT = 1004;

/** The generic copy the dialog falls back to when nothing better resolved. */
const UNEXPECTED_COPY = 'An unexpected error occurred.';

const TS_PAGE = '/pages/html-simple-hls-video-ts.html';
const FMP4_PAGE = '/pages/html-simple-hls-video-fmp4.html';
const FMP4_URL = MEDIA.hlsFmp4.url;

interface SurfacedError {
  code: number;
  message: string;
}

/** The error the media surface exposes, or null while none has surfaced. */
function readSurfacedError(): SurfacedError | null {
  const media = document.querySelector('simple-hls-video') as (HTMLElement & { error?: SurfacedError | null }) | null;
  return media?.error ?? null;
}

/** Every SVTA code in the engine's reported sequence, causes included. */
function readReportedCodes(): number[] {
  const media = document.querySelector('simple-hls-video') as
    | (HTMLElement & { engine?: { state?: { errors?: { get(): Array<{ code: number }> | undefined } } } })
    | null;
  return (media?.engine?.state?.errors?.get() ?? []).map((error) => error.code);
}

async function waitForSurfacedError(page: Page): Promise<SurfacedError> {
  await page.waitForFunction(
    () => {
      const media = document.querySelector('simple-hls-video') as (HTMLElement & { error?: unknown }) | null;
      return !!media?.error;
    },
    undefined,
    { timeout: 20_000 }
  );

  const error = await page.evaluate(readSurfacedError);
  expect(error).not.toBeNull();
  return error as SurfacedError;
}

test.describe('SPF unsupported-source errors', () => {
  test('an MPEG-TS source with no fMP4 rendition surfaces a fatal no-playable-video verdict', async ({ page }) => {
    await page.goto(TS_PAGE);

    const error = await waitForSurfacedError(page);

    // The verdict, not one of its causes: a single unplayable rendition
    // doesn't fail a source, so only the "nothing left to select" outcome is
    // fatal enough to reach the media surface.
    expect(error.code).toBe(SVTA_NO_SUPPORTED_VIDEO_TRACK);
    expect(error.message).not.toBe('');
  });

  test('the reported sequence keeps the per-rendition cause behind the verdict', async ({ page }) => {
    await page.goto(TS_PAGE);
    await waitForSurfacedError(page);

    const codes = await page.evaluate(readReportedCodes);

    // Stacking (SVTA Principle 6): the cause is reported per rendition as it
    // resolves and stays in the sequence, so the verdict has something to
    // attribute itself to. Cause before verdict — that ordering is what lets a
    // consumer say *why* rather than only *that*.
    expect(codes).toContain(SVTA_UNSUPPORTED_VIDEO_FORMAT);
    expect(codes).toContain(SVTA_NO_SUPPORTED_VIDEO_TRACK);
    expect(codes.indexOf(SVTA_UNSUPPORTED_VIDEO_FORMAT)).toBeLessThan(codes.indexOf(SVTA_NO_SUPPORTED_VIDEO_TRACK));
  });

  test('the verdict opens the error dialog with engine-supplied copy', async ({ page }) => {
    await page.goto(TS_PAGE);

    const errorDialog = page.locator(SELECTORS.errorDialog).first();
    await expect(errorDialog).toHaveAttribute(DATA_ATTRS.open, '', { timeout: 20_000 });

    // Loose on wording, strict on provenance: the copy has to come from the
    // engine's message rather than the store's generic fallback, which is what
    // proves the code and message travelled the whole chain.
    const description = page.locator('media-alert-dialog-description').first();
    await expect(description).not.toHaveText(UNEXPECTED_COPY);
    await expect(description).toContainText(/format this browser/i);
  });

  test('changing to a playable source clears the error and dismisses the dialog', async ({ page }) => {
    await page.goto(TS_PAGE);

    const errorDialog = page.locator(SELECTORS.errorDialog).first();
    await expect(errorDialog).toHaveAttribute(DATA_ATTRS.open, '', { timeout: 20_000 });

    await page.evaluate((url) => {
      const media = document.querySelector('simple-hls-video') as (HTMLElement & { src?: string }) | null;
      if (media) media.src = url;
    }, FMP4_URL);

    // Per-source reset, verified through the whole chain rather than only at
    // the slot: `collectErrors` clears the sequence on source change, so the
    // adapter's `error` follows without its own source-change hook, and the
    // store's own reset (the inner element's native `emptied`, re-dispatched by
    // the host) closes the dialog.
    await page.waitForFunction(
      () => {
        const media = document.querySelector('simple-hls-video') as (HTMLElement & { error?: unknown }) | null;
        return !!media && !media.error;
      },
      undefined,
      { timeout: 20_000 }
    );
    await expect(errorDialog).not.toHaveAttribute(DATA_ATTRS.open, { timeout: 20_000 });

    // And the replacement source genuinely plays — recovery, not just a
    // cleared flag over a dead engine.
    await page.waitForFunction(
      () => {
        const host = document.querySelector('simple-hls-video');
        const video = (host?.querySelector('video') ??
          host?.shadowRoot?.querySelector('video')) as HTMLVideoElement | null;
        return !!video && video.readyState >= 1;
      },
      undefined,
      { timeout: 20_000 }
    );
  });

  test('a playable fMP4 source surfaces no error and leaves the dialog closed', async ({ page }) => {
    const player = new PlayerPage(page);
    await page.goto(FMP4_PAGE);
    await player.waitForMediaReady();

    // The control: the same engine, the same reporters composed, a source it
    // can play. Without this, a spec that always reported fatal would pass.
    expect(await page.evaluate(readSurfacedError)).toBeNull();
    await expect(page.locator(SELECTORS.errorDialog).first()).not.toHaveAttribute(DATA_ATTRS.open);
  });
});
