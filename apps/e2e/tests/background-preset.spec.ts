import { expect, test } from '@playwright/test';

const variants = [
  { framework: 'HTML', page: '/pages/html-background-preset.html' },
  { framework: 'React', page: '/pages/react-background-preset.html' },
] as const;

for (const variant of variants) {
  test.describe(`${variant.framework} Background preset`, () => {
    test('preserves sizing, object fit, and media layering', async ({ page }) => {
      await page.goto(variant.page);

      const skin = page.locator('.background-preset');
      const media = skin.locator('[data-background-media]');
      const poster = skin.locator('[data-background-poster]');

      await expect(skin).toBeVisible();
      await expect(skin).toHaveCSS('position', 'relative');
      await expect(skin).toHaveCSS('width', '640px');
      await expect(skin).toHaveCSS('height', '360px');
      await expect(skin).toHaveCSS('object-fit', 'contain');
      await expect(media).toHaveCSS('position', 'absolute');
      await expect(media).toHaveCSS('width', '640px');
      await expect(media).toHaveCSS('height', '360px');
      await expect(poster).toHaveCSS('width', '640px');
      await expect(poster).toHaveCSS('height', '360px');
      await expect(poster).toHaveCSS('object-fit', 'contain');

      if (variant.framework === 'HTML') {
        await expect(page.locator('background-video-player')).toHaveCSS('display', 'contents');

        const videoFit = await media.evaluate(
          (element) => getComputedStyle(element.shadowRoot!.querySelector('video')!).objectFit
        );

        expect(videoFit).toBe('contain');
      } else {
        await expect(media).toHaveCSS('object-fit', 'contain');
      }
    });
  });
}
