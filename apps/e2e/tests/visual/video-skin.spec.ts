import { expect, test } from '@playwright/test';
import { DATA_ATTRS, SELECTORS } from '../../fixtures/selectors';
import { PlayerPage } from '../../page-objects/player';

/**
 * Visual snapshot tests for the video skin.
 *
 * These verify the skin's CSS and layout aren't broken — not UX interactions.
 * Strategy:
 * - Screenshot the skin container in its initial paused state
 * - Generous pixel thresholds absorb cross-platform rendering differences
 * - Animations disabled globally (configured in playwright.config.ts)
 */

const VISUAL_PAGES = [
  { name: 'HTML', path: '/html-video-mp4.html' },
  { name: 'React', path: '/react-video-mp4.html' },
  { name: 'Ejected-HTML', path: '/ejected-html-video-mp4.html' },
  { name: 'Ejected-React', path: '/ejected-react-video-mp4.html' },
  { name: 'CDN', path: '/cdn-video-mp4.html' },
];

for (const { name, path } of VISUAL_PAGES) {
  test.describe(`Visual — Video Skin (${name})`, () => {
    let player: PlayerPage;

    test.beforeEach(async ({ page }) => {
      player = new PlayerPage(page);
      await page.goto(path);
      await player.waitForMediaReady();
    });

    test('default paused state', async ({ page }) => {
      await player.showControls();
      await page.waitForTimeout(300);

      await expect(player.playerRoot).toHaveScreenshot(`video-${name.toLowerCase()}-default.png`);
    });

    test('storyboard thumbnail on hover', async ({ page }) => {
      await player.hoverTimeSlider(50);

      // Wait for thumbnail to finish loading (deterministic, no fixed timeout)
      const thumbnail = page.locator(SELECTORS.thumbnail).first();
      await expect(thumbnail).toBeAttached({ timeout: 10_000 });
      await expect(thumbnail).not.toHaveAttribute(DATA_ATTRS.loading, { timeout: 10_000 });

      await expect(player.playerRoot).toHaveScreenshot(`video-${name.toLowerCase()}-storyboard.png`);
    });

    test('captions visible', async ({ page }) => {
      // Add a subtitle track and enable captions
      await page.evaluate((mediaSelector) => {
        const el = document.querySelector(mediaSelector);
        const video = (el?.querySelector?.('video') as HTMLVideoElement) ?? (el as HTMLVideoElement);
        if (!video) return;

        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = 'English';
        track.srclang = 'en';
        track.src = `data:text/vtt,${encodeURIComponent('WEBVTT\n\n00:00:00.000 --> 00:00:30.000\nThis is a test caption')}`;
        track.default = true;
        video.appendChild(track);
      }, SELECTORS.media);

      // Wait for captions button to become available and click it
      const captionsBtn = page.locator(SELECTORS.captionsButton).first();
      await expect(captionsBtn).toHaveAttribute(DATA_ATTRS.availability, 'available', {
        timeout: 5_000,
      });
      await captionsBtn.click();
      await expect(captionsBtn).toHaveAttribute(DATA_ATTRS.active, '');

      // Play briefly so the caption cue activates, then pause
      await player.play();
      await page.waitForTimeout(500);
      await player.pause();
      await player.showControls();

      await expect(player.playerRoot).toHaveScreenshot(`video-${name.toLowerCase()}-captions.png`);
    });
  });
}
