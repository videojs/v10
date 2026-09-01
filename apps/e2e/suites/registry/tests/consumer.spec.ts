import { expect, test } from '@playwright/test';

test('installs a styled player with an attached media element', async ({ page }) => {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  for (const { name, radius } of [
    { name: 'default', radius: '28px' },
    { name: 'minimal', radius: '12px' },
  ]) {
    const consumer = page.locator(`[data-registry-skin="${name}"]`);
    const skin = consumer.locator('.media-skin');
    const controls = skin.locator('media-controls, .video-controls, .audio-controls').first();
    const media = consumer.locator('video');

    await expect(skin).toBeVisible();
    await expect(controls).toBeAttached();
    await expect(media).toBeAttached();
    await expect(skin).toHaveCSS('position', 'relative');
    await expect(skin).toHaveCSS('display', 'block');
    await expect(skin).toHaveCSS('border-radius', radius);

    const theme = await skin.evaluate((element) => {
      const style = getComputedStyle(element);

      return {
        controlSize: style.getPropertyValue('--media-control-size').trim(),
        spacing: style.getPropertyValue('--media-spacing').trim(),
      };
    });

    expect(theme.controlSize).not.toBe('');
    expect(theme.spacing).not.toBe('');

    const box = await skin.boundingBox();

    expect(box?.width).toBeGreaterThan(500);
    expect(box?.height).toBeGreaterThan(250);

    const playButton = consumer.getByRole('button', { name: /play/i }).first();

    await expect(playButton).toBeVisible();

    const controlBox = await playButton.boundingBox();

    expect(controlBox?.width).toBeGreaterThan(30);
    expect(controlBox?.height).toBeGreaterThan(30);

    const icon = playButton.locator('media-icon:visible, svg:visible').first();

    await expect(icon).toBeVisible();

    const iconBox = await icon.boundingBox();

    expect(iconBox?.width).toBeGreaterThan(10);
    expect(iconBox?.height).toBeGreaterThan(10);

    if (test.info().project.name.startsWith('next-')) {
      await expect(consumer.locator('[data-media-probe]')).toHaveAttribute('data-attached', 'true');
    }
  }

  const settings = page.locator('[data-registry-skin="default"]').getByRole('button', { name: 'Settings' });

  await expect(settings).toBeVisible();
  await settings.click();
  await expect(settings).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(settings).toHaveAttribute('aria-expanded', 'false');

  expect(errors).toEqual([]);
});
