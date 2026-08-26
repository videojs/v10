import { expect, test } from '@playwright/test';

const SOURCE_SKINS = [
  { framework: 'HTML', path: '/pages/source-html-video-mp4.html' },
  { framework: 'React', path: '/pages/source-react-video-mp4.html' },
] as const;

for (const { framework, path } of SOURCE_SKINS) {
  test.describe(`Canonical Skin container — ${framework}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
      await page.locator('[data-source-skin]').waitFor();
      await page.locator('video').evaluate(async (video: HTMLVideoElement) => {
        await new Promise<void>((resolve) => {
          if (video.readyState >= 1) resolve();
          else video.addEventListener('loadedmetadata', () => resolve(), { once: true });
        });
      });
    });

    test('renders media and poster in one container composition', async ({ page }) => {
      const skin = page.locator('[data-source-skin]');
      const posterImage = skin.locator('media-poster img, img.media-poster').first();

      await expect(skin).toBeAttached();
      await expect(page.locator('video')).toBeAttached();
      await expect(skin.locator('media-poster, img.media-poster')).toBeAttached();
      await expect(skin.locator('media-controls-content, .media-controls')).toBeAttached();
      await expect(skin.locator('media-controls-backdrop, .media-controls__backdrop')).toBeAttached();
      await expect(skin.locator('media-seek-button, .media-seek-button')).toHaveCount(0);
      await expect(posterImage).toHaveAttribute('src', /thumbnail/);
    });

    test('hides the poster once playback starts', async ({ page }) => {
      const poster = page.locator('media-poster, img.media-poster').first();

      await expect(poster).toHaveAttribute('data-visible', '');
      await expect(poster).toHaveCSS('opacity', '1');
      await page.locator('video').evaluate((video: HTMLVideoElement) => video.play());
      await expect(poster).not.toHaveAttribute('data-visible');
      await expect(poster).toHaveCSS('opacity', '0');
    });
  });
}
