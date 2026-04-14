import { expect, test } from '@playwright/test';
import { DATA_ATTRS, SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

test.describe('Keyboard Navigation', () => {
  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/pages/html-video-mp4.html');
    await player.waitForMediaReady();
  });

  test('Space key toggles play/pause on play button', async ({ page }) => {
    await player.playButton.focus();
    await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');

    await page.keyboard.press('Space');
    await expect(player.playButton).not.toHaveAttribute(DATA_ATTRS.paused);

    await page.keyboard.press('Space');
    await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');
  });

  test('Enter key toggles play/pause on play button', async ({ page }) => {
    await player.playButton.focus();
    await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');

    await page.keyboard.press('Enter');
    await expect(player.playButton).not.toHaveAttribute(DATA_ATTRS.paused);

    await page.keyboard.press('Enter');
    await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');
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
    // Media starts muted (see PlayerPage.waitForMediaReady)
    await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.muted, '');

    await page.keyboard.press('Space');
    await expect(player.muteButton).not.toHaveAttribute(DATA_ATTRS.muted);

    await page.keyboard.press('Space');
    await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.muted, '');
  });
});
