import { expect, test } from '@playwright/test';
import { SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

test.describe('Keyboard Navigation', () => {
  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/html-video-mp4.html');
    await player.waitForMediaReady();
  });

  test('Space key toggles play/pause on play button', async ({ page }) => {
    await player.playButton.focus();
    await expect(player.playButton).toHaveAttribute('data-paused', '');

    await page.keyboard.press('Space');
    await expect(player.playButton).not.toHaveAttribute('data-paused');

    await page.keyboard.press('Space');
    await expect(player.playButton).toHaveAttribute('data-paused', '');
  });

  test('Enter key toggles play/pause on play button', async ({ page }) => {
    await player.playButton.focus();
    await expect(player.playButton).toHaveAttribute('data-paused', '');

    await page.keyboard.press('Enter');
    await expect(player.playButton).not.toHaveAttribute('data-paused');

    await page.keyboard.press('Enter');
    await expect(player.playButton).toHaveAttribute('data-paused', '');
  });

  test('Tab navigates between controls', async ({ page }) => {
    await player.playButton.focus();
    await expect(player.playButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(player.playButton).not.toBeFocused();
  });

  test('Arrow keys adjust time slider', async ({ page }) => {
    // Seek somewhere first so arrow keys have room to adjust
    await player.seekTo(50);

    // The slider thumb (role="slider") receives keyboard focus, not the slider root
    const sliderThumb = page.locator(SELECTORS.sliderThumb).first();
    await sliderThumb.focus();

    // Press ArrowRight — should trigger a seek (data-started is already set from seekTo)
    const timeBefore = await player.currentTime.textContent();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);

    // Time should have changed after arrow key
    const timeAfter = await player.currentTime.textContent();
    expect(timeAfter).not.toBe(timeBefore);
  });

  test('Space key toggles mute on mute button', async ({ page }) => {
    await player.muteButton.focus();
    await expect(player.muteButton).not.toHaveAttribute('data-muted');

    await page.keyboard.press('Space');
    await expect(player.muteButton).toHaveAttribute('data-muted', '');

    await page.keyboard.press('Space');
    await expect(player.muteButton).not.toHaveAttribute('data-muted');
  });
});
