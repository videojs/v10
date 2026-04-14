import { expect, test } from '@playwright/test';
import { DATA_ATTRS, SELECTORS } from '../../fixtures/selectors';
import { PlayerPage } from '../../page-objects/player';

test.describe('Visual — Captions', () => {
  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/html-video-mp4.html');
    await player.waitForMediaReady();

    // Add a subtitle track with visible text at 0:00–0:30
    await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (!video) return;

      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = 'English';
      track.srclang = 'en';
      track.src = `data:text/vtt,${encodeURIComponent('WEBVTT\n\n00:00:00.000 --> 00:00:30.000\nThis is a test caption')}`;
      track.default = true;
      video.appendChild(track);
    });

    // Wait for captions button to become available
    const captionsBtn = page.locator(SELECTORS.captionsButton).first();
    await expect(captionsBtn).toHaveAttribute(DATA_ATTRS.availability, 'available', {
      timeout: 5_000,
    });

    // Enable captions
    await captionsBtn.click();
    await expect(captionsBtn).toHaveAttribute(DATA_ATTRS.active, '');

    // Start playback so the caption cue activates at 0:00
    await player.play();
    await page.waitForTimeout(500);
    await player.pause();
  });

  test('captions visible during playback', async ({ page }) => {
    await player.showControls();
    await page.waitForTimeout(300);

    await expect(player.playerRoot).toHaveScreenshot('captions-visible.png');
  });
});
