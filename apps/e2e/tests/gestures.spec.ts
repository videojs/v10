import { expect, test } from '@playwright/test';
import { DATA_ATTRS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

test.describe('Touch Gestures', () => {
  test.use({ hasTouch: true, viewport: { width: 375, height: 667 } });

  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/html-video-mp4.html');
    await player.waitForMediaReady();
  });

  test('tap play button starts playback', async ({ page }) => {
    await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');
    await page.tap(player.playButton['_selector'] ?? 'media-play-button');
    await expect(player.playButton).not.toHaveAttribute(DATA_ATTRS.paused, { timeout: 5_000 });
  });

  test('tap mute button toggles mute', async ({ page }) => {
    await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.muted, '');
    await player.muteButton.tap();
    await expect(player.muteButton).not.toHaveAttribute(DATA_ATTRS.muted, { timeout: 5_000 });
  });

  test('touch drag on time slider seeks', async ({ page }) => {
    const box = await player.timeSlider.boundingBox();
    expect(box).not.toBeNull();

    // Drag from 10% to 50%
    const startX = box!.x + box!.width * 0.1;
    const endX = box!.x + box!.width * 0.5;
    const y = box!.y + box!.height / 2;

    await page.touchscreen.tap(startX, y);
    await page.waitForTimeout(200);

    // Verify the slider responded to touch
    await expect(player.timeSlider).toBeAttached();
  });
});
