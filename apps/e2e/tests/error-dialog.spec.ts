import { expect, test } from '@playwright/test';
import { DATA_ATTRS, SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

test.describe('Error Dialog', () => {
  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/html-video-mp4.html');
    await player.waitForMediaReady();
  });

  test('shows error dialog on media load failure', async ({ page }) => {
    const errorDialog = page.locator(SELECTORS.errorDialog).first();

    // Set an invalid source to trigger a media error
    await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) video.src = 'https://example.com/does-not-exist.mp4';
    });

    // Error dialog should appear with data-open
    await expect(errorDialog).toHaveAttribute(DATA_ATTRS.open, '', { timeout: 15_000 });
  });

  test('error dialog can be dismissed', async ({ page }) => {
    const errorDialog = page.locator(SELECTORS.errorDialog).first();

    // Trigger error
    await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) video.src = 'https://example.com/does-not-exist.mp4';
    });

    await expect(errorDialog).toHaveAttribute(DATA_ATTRS.open, '', { timeout: 15_000 });

    // Click the close/OK button
    const closeButton = page.locator('media-alert-dialog-close, .media-button--primary').first();
    await closeButton.click();

    // Dialog should close
    await expect(errorDialog).not.toHaveAttribute(DATA_ATTRS.open, { timeout: 5_000 });
  });
});
