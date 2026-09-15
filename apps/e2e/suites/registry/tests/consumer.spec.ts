import { expect, test } from '@playwright/test';

const visualProjects = new Set(['next-react-tailwind', 'next-react-tailwind-minimal']);

for (const preset of ['video', 'audio'] as const) {
  test(`installs a styled ${preset} player with an attached media element`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    const theme = testInfo.project.metadata.theme;
    if (theme !== 'default' && theme !== 'minimal') throw new Error(`Unknown registry theme: ${String(theme)}.`);

    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');

    const consumer = page.locator(`[data-registry-skin="${preset}"]`);
    const skin = consumer.locator('.media-skin');
    const controls = skin.locator('media-controls, .video-controls, .audio-controls').first();
    const media = consumer.locator(preset);

    await expect(skin).toBeVisible();
    await expect(skin).toHaveAttribute('data-theme', theme);
    await expect(controls).toBeAttached();
    await expect(media).toBeAttached();
    await expect(skin).toHaveCSS('position', 'relative');
    await expect(skin).toHaveCSS('display', 'block');
    await expect(skin).toHaveCSS('border-radius', theme === 'minimal' ? '12px' : '28px');

    const themeStyles = await skin.evaluate((element) => {
      const style = getComputedStyle(element);

      return {
        controlSize: style.getPropertyValue('--media-control-size').trim(),
        spacing: style.getPropertyValue('--media-spacing').trim(),
      };
    });

    expect(themeStyles.controlSize).not.toBe('');
    expect(themeStyles.spacing).not.toBe('');

    const box = await skin.boundingBox();

    expect(box?.width).toBeGreaterThan(500);
    expect(box?.height).toBeGreaterThan(preset === 'video' ? 250 : 30);

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

    // The React page carries a probe that reports whether the media element reached the player store.
    if ((await consumer.locator('[data-media-probe]').count()) > 0) {
      await expect(consumer.locator('[data-media-probe]')).toHaveAttribute('data-attached', 'true');
    }

    if (visualProjects.has(testInfo.project.name)) {
      await skin.hover();
      await expect(skin).toHaveScreenshot(`${preset}-${theme}.png`);
    }

    if (preset === 'video') {
      const settings = consumer.getByRole('button', { name: 'Settings' });

      await expect(settings).toBeVisible();
      await settings.click();
      await expect(settings).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(settings).toHaveAttribute('aria-expanded', 'false');
    }

    expect(errors).toEqual([]);
  });
}
