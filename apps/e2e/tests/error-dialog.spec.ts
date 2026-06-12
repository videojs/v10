import { expect, type Page, test } from '@playwright/test';
import { DATA_ATTRS, SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

test.describe('Error Dialog', () => {
  let player: PlayerPage;

  async function triggerError(page: Page) {
    await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (!video) return;

      Object.defineProperty(video, 'error', {
        configurable: true,
        value: { code: 4, message: 'Test media error' },
      });
      video.dispatchEvent(new Event('error'));
    });
  }

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/pages/html-video-mp4.html');
    await player.waitForMediaReady();
  });

  test('shows error dialog on media load failure', async ({ page }) => {
    const errorDialog = page.locator(SELECTORS.errorDialog).first();

    await triggerError(page);

    // Error dialog should appear with data-open
    await expect(errorDialog).toHaveAttribute(DATA_ATTRS.open, '', { timeout: 15_000 });
  });

  test('error dialog can be dismissed', async ({ page }) => {
    const errorDialog = page.locator(SELECTORS.errorDialog).first();

    await triggerError(page);

    await expect(errorDialog).toHaveAttribute(DATA_ATTRS.open, '', { timeout: 15_000 });

    // Click the close/OK button
    const closeButton = page.locator('media-alert-dialog-close, .media-button--primary').first();
    await closeButton.click();

    // Dialog should close
    await expect(errorDialog).not.toHaveAttribute(DATA_ATTRS.open, { timeout: 5_000 });
  });
});
