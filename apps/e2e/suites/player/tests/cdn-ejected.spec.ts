import { expect, test } from '@playwright/test';

test('updates volume slider parts when an ejected layout exists before CDN registration', async ({ page }) => {
  await page.goto('/cdn-ejected.html');

  const slider = page.locator('media-volume-slider');
  const thumb = slider.locator('media-slider-thumb');
  const parts = [slider, slider.locator('media-slider-track'), slider.locator('media-slider-fill'), thumb];

  for (const part of parts) await expect(part).toHaveAttribute('data-orientation', 'vertical');

  await expect(thumb).toHaveAttribute('aria-orientation', 'vertical');

  await slider.evaluate((element) => element.setAttribute('orientation', 'horizontal'));

  for (const part of parts) await expect(part).toHaveAttribute('data-orientation', 'horizontal');

  await expect(thumb).toHaveAttribute('aria-orientation', 'horizontal');
});
