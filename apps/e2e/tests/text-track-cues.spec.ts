import { expect, test } from '@playwright/test';

test('activates cues on a programmatic src-less track and removes it on destroy', async ({ page }) => {
  await page.goto('/text-track-cues.html');

  // Poll a window property rather than awaiting a page promise so a dev-server reload cannot strand the evaluation.
  await page.waitForFunction(() => window.textTrackCuesResult !== undefined, undefined, { timeout: 30_000 });

  const result = await page.evaluate(() => window.textTrackCuesResult);

  expect(result).toEqual({
    reason: 'cuechange',
    mode: 'hidden',
    cues: 1,
    activeCues: 1,
    trackCount: 1,
  });

  const afterDestroy = await page.evaluate(() => {
    window.textTrackCuesHandle.destroy();

    const video = document.querySelector('video')!;

    return {
      mode: window.textTrackCuesHandle.track.mode,
      trackElements: video.querySelectorAll('track').length,
      trackCount: video.textTracks.length,
    };
  });

  expect(afterDestroy).toEqual({ mode: 'disabled', trackElements: 0, trackCount: 0 });
});
