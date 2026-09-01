import { expect, test } from '@playwright/test';

test('installs a styled player with an attached media element', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  const skin = page.locator('.media-skin');
  const controls = page.locator('media-controls, .video-controls, .audio-controls').first();
  const media = page.locator('video');

  await expect(skin).toBeVisible();
  await expect(controls).toBeAttached();
  await expect(media).toBeAttached();
  await expect(skin).toHaveCSS('position', 'relative');
  await expect(skin).toHaveCSS('display', 'block');

  const box = await skin.boundingBox();

  expect(box?.width).toBeGreaterThan(500);
  expect(box?.height).toBeGreaterThan(250);

  if (test.info().project.name.startsWith('next-')) {
    await expect(page.getByTestId('media-probe')).toHaveAttribute('data-attached', 'true');
  }

  expect(errors).toEqual([]);
});
