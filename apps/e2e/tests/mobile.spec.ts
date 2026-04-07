import { expect, test } from '@playwright/test';
import { PlayerPage } from '../page-objects/player';

test.describe('Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/html-video-mp4.html');
    await player.waitForMediaReady();
  });

  test('player renders at mobile width', async () => {
    const root = player.playerRoot;
    const box = await root.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(375);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('play button works on mobile', async () => {
    await expect(player.playButton).toHaveAttribute('data-paused', '');
    await player.play();
    await expect(player.playButton).not.toHaveAttribute('data-paused');
  });

  test('mute button works on mobile', async () => {
    await player.muteButton.click();
    await expect(player.muteButton).toHaveAttribute('data-muted', '');
  });

  test('controls are accessible on mobile', async () => {
    await expect(player.playButton).toBeAttached();
    await expect(player.muteButton).toBeAttached();
    await expect(player.timeSlider).toBeAttached();
    await expect(player.playbackRateButton).toBeAttached();
  });
});
