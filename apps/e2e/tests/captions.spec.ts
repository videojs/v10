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

  test('captions settings are unavailable without subtitle tracks', async () => {
    await player.showControls();
    await player.settingsButton.click();
    await expect(player.settingsCaptionsItem).toHaveAttribute(DATA_ATTRS.availability, 'unavailable');
    await expect(player.settingsCaptionsItem).toHaveAttribute('aria-disabled', 'true');
  });

  test('captions settings lists tracks when subtitle track is added', async ({ page }) => {
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

    await player.showControls();
    await player.openCaptionsSettings();

    const options = page.locator(SELECTORS.activeMenuOptions);
    await expect(options).toHaveCount(2, { timeout: 5_000 });
  });
});
