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
 * type that has renditions but none selectable. The adapter then substitutes
 * the unsupported-playback-feature code, because a cause it has no pipeline
 * for is more useful to a consumer than "a type emptied".
 *
 * Assertions are split deliberately. The code the adapter surfaces is the
 * engine's contract and is asserted exactly — as is the empty `message`, whose
 * emptiness is load-bearing: `resolveErrorDialogDescription` prefers a
 * non-empty message over the translation a code resolves to, so engine prose
 * here would silently displace the localized copy. Dialog copy is asserted
 * against the player's own `errors.unplayable` translation, which is where
 * viewer-facing wording lives now that the engine reports a code instead.
 *
 * @see internal/design/spf/features/errors.md
 */

/** SVTA 99 [Custom] 001 — the engine has no pipeline for what the source needs. */
const SVTA_UNSUPPORTED_PLAYBACK_FEATURE = 99001;

/** SVTA 2 [Playback] 011 — a source with video renditions, none of them playable. */
const SVTA_NO_SUPPORTED_VIDEO_TRACK = 2011;

/** SVTA 1 [Media Content] 004 — the per-rendition cause behind the verdict. */
const SVTA_UNSUPPORTED_VIDEO_FORMAT = 1004;

/** The generic copy the dialog falls back to when nothing better resolved. */
const UNEXPECTED_COPY = 'An unexpected error occurred.';

/** `errors.unplayable` — what the surfaced code resolves to in the default locale. */
const UNPLAYABLE_COPY = 'This media is unsupported by the player.';

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
  test('an MPEG-TS source with no fMP4 rendition surfaces a fatal unsupported-playback-feature error', async ({
    page,
  }) => {
    await page.goto(TS_PAGE);

    const error = await waitForSurfacedError(page);

    // Only a *verdict* is fatal enough to reach this surface — a single
    // unplayable rendition doesn't fail a source. But the code that lands here
    // isn't the verdict's: the sequence also holds a cause this engine has no
    // pipeline for (1004, an MPEG-TS container), and the adapter substitutes
    // the unsupported-playback-feature code because "we don't implement this"
    // is what a consumer can act on. Both original codes stay in the
    // sequence — see the next test.
    expect(error.code).toBe(SVTA_UNSUPPORTED_PLAYBACK_FEATURE);
    // Deliberately empty. Viewer-facing copy is the consumer's to localize from
    // the code, and a message here would take precedence over the player's
    // `errors.unplayable` translation in the dialog.
    expect(error.message).toBe('');
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

  test("the verdict opens the error dialog with the player's unplayable copy", async ({ page }) => {
    await page.goto(TS_PAGE);

    const errorDialog = page.locator(SELECTORS.errorDialog).first();
    await expect(errorDialog).toHaveAttribute(DATA_ATTRS.open, '', { timeout: 20_000 });

    // Strict on provenance: the copy has to be the translation the surfaced code
    // resolves to, not the store's generic fallback. Distinguishing the two is
    // what proves the code travelled the whole chain — engine → adapter `error`
    // → the store's error feature → `resolveErrorDialogDescription`.
    const description = page.locator('media-alert-dialog-description').first();
    await expect(description).not.toHaveText(UNEXPECTED_COPY);
    await expect(description).toContainText(UNPLAYABLE_COPY);
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
