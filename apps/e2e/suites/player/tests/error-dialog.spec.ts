import { expect, type Page, test } from '@playwright/test';

import { DATA_ATTRS, SELECTORS } from '../../../shared/fixtures/selectors';
import { PlayerPage } from '../../../shared/page-objects/player';

test.describe('Error Dialog', () => {
  let player: PlayerPage;

  async function triggerError(page: Page, message = 'Test media error') {
    await page.evaluate((errorMessage) => {
      const video = document.querySelector('video');
      if (!(video instanceof HTMLVideoElement)) return;

      Object.defineProperty(video, 'error', {
        configurable: true,
        value: { code: 4, message: errorMessage },
      });
      video.dispatchEvent(new Event('error'));
    }, message);
  }

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/pages/html-video-mp4.html');
    await player.waitForMediaReady();
  });

  test('keeps the popup hidden before an error occurs', async ({ page }) => {
    await expect(page.locator('media-dialog-popup.media-dialog__popup')).toBeHidden();
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
    const closeButton = page.locator('media-dialog-close, .media-button--primary').first();

    await closeButton.click();

    // Dialog should close
    await expect(errorDialog).not.toHaveAttribute(DATA_ATTRS.open, { timeout: 5_000 });
  });

  test('keeps page content outside the player interactive', async ({ page }) => {
    await page.evaluate(() => {
      const button = document.createElement('button');

      button.id = 'outside-player';
      button.textContent = 'Outside action';
      button.addEventListener('click', () => button.setAttribute('data-clicked', ''));
      document.body.prepend(button);
    });

    await triggerError(page);

    const errorDialog = page.locator(SELECTORS.errorDialog).first();
    const popup = errorDialog.locator('media-dialog-popup');
    const outsideButton = page.locator('#outside-player');

    await expect(errorDialog).toHaveAttribute(DATA_ATTRS.open, '', { timeout: 15_000 });
    await expect(popup).not.toHaveAttribute('aria-modal');
    await expect(outsideButton).not.toHaveAttribute('inert');

    await outsideButton.click();
    await outsideButton.focus();

    await expect(outsideButton).toHaveAttribute('data-clicked', '');
    await expect(outsideButton).toBeFocused();
  });

  test('keeps long error content and the dismiss action inside a narrow player', async ({ page }) => {
    await player.playerRoot.evaluate((element) => {
      if (element instanceof HTMLElement) element.style.width = '320px';
    });
    await triggerError(page, 'A long authored playback error message. '.repeat(120));

    const popup = page.getByRole('alertdialog');
    const content = popup.locator('.media-dialog__content');

    await expect(popup).toBeVisible({ timeout: 15_000 });
    await expect(player.controls).toBeHidden();

    const scrollRange = await content.evaluate((element) => element.scrollHeight - element.clientHeight);

    expect(scrollRange).toBeGreaterThan(0);

    const contract = await player.playerRoot.evaluate((root) => {
      const popup = root.querySelector<HTMLElement>('[role="alertdialog"]');
      const title = popup?.querySelector<HTMLElement>('media-dialog-title');
      const description = popup?.querySelector<HTMLElement>('media-dialog-description');
      const close = popup?.querySelector<HTMLElement>('media-dialog-close');
      if (!popup || !title || !description || !close) throw new Error('Expected a complete error dialog.');

      const rootRect = root.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      const closeRect = close.getBoundingClientRect();

      return {
        popupInside: popupRect.top >= rootRect.top && popupRect.bottom <= rootRect.bottom,
        closeInside: closeRect.top >= rootRect.top && closeRect.bottom <= rootRect.bottom,
        titleMargin: getComputedStyle(title).margin,
        descriptionMargin: getComputedStyle(description).margin,
      };
    });

    expect(contract).toEqual({
      popupInside: true,
      closeInside: true,
      titleMargin: '0px',
      descriptionMargin: '0px',
    });
  });
});
