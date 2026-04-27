import { expect, test } from '@playwright/test';
import { DATA_ATTRS, SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

test.describe('Captions', () => {
  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/pages/html-video-mp4.html');
    await player.waitForMediaReady();
  });

  test('captions button shows unavailable without subtitle tracks', async ({ page }) => {
    const captionsBtn = page.locator(SELECTORS.captionsButton).first();
    await expect(captionsBtn).toHaveAttribute(DATA_ATTRS.availability, 'unavailable');
  });

  test('captions button becomes available when subtitle track is added', async ({ page }) => {
    const captionsBtn = page.locator(SELECTORS.captionsButton).first();

    // Initially unavailable
    await expect(captionsBtn).toHaveAttribute(DATA_ATTRS.availability, 'unavailable');

    // Add a subtitle track
    await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (!video) return;

      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = 'English';
      track.srclang = 'en';
      track.src = `data:text/vtt,${encodeURIComponent('WEBVTT\n\n00:00:00.000 --> 00:00:30.000\nTest caption')}`;
      video.appendChild(track);
    });

    // Button should switch to available
    await expect(captionsBtn).toHaveAttribute(DATA_ATTRS.availability, 'available', {
      timeout: 5_000,
    });
  });
});
