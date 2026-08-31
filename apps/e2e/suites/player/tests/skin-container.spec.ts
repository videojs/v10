import { expect, test } from '@playwright/test';

const SOURCE_SKINS = [
  { framework: 'HTML', path: '/pages/source-html-video-mp4.html' },
  { framework: 'React', path: '/pages/source-react-video-mp4.html' },
] as const;

const POSTER_SKINS = [
  { framework: 'packaged HTML', path: '/pages/html-video-mp4.html', selector: 'img[slot="poster"]' },
  { framework: 'packaged React', path: '/pages/react-video-mp4.html', selector: '.media-skin > img' },
  { framework: 'VJSC HTML', path: '/pages/source-html-video-mp4.html', selector: 'media-poster img' },
  { framework: 'VJSC React', path: '/pages/source-react-video-mp4.html', selector: 'img.media-poster' },
] as const;

for (const { framework, path } of SOURCE_SKINS) {
  test.describe(`Canonical Skin container — ${framework}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-source-skin]').waitFor({ timeout: 20_000 });
    });

    test('renders media and poster in one container composition', async ({ page }) => {
      const skin = page.locator('[data-source-skin]');
      const posterImage = skin.locator('media-poster img, img.media-poster').first();

      await expect(skin).toBeAttached();
      await expect(page.locator('video')).toBeAttached();
      await expect(skin.locator('media-poster, img.media-poster')).toBeAttached();
      await expect(skin.locator('media-controls-content, .media-controls')).toBeAttached();
      await expect(skin.locator('media-controls-backdrop, .media-controls-backdrop')).toBeAttached();
      await expect(skin.locator('media-seek-button, .media-seek-button')).toHaveCount(0);
      await expect(posterImage).toHaveAttribute('src', /thumbnail/);
    });

    test('hides the poster once playback starts', async ({ page }) => {
      const poster = page.locator('media-poster, img.media-poster').first();

      await expect(poster).toHaveAttribute('data-visible', '');
      await expect(poster).toHaveCSS('opacity', '1');
      await page.locator('video').evaluate((video: HTMLVideoElement) => {
        setTimeout(() => void video.play().catch(() => {}));
      });
      await expect(poster).not.toHaveAttribute('data-visible');
      await expect(poster).toHaveCSS('opacity', '0');
    });
  });
}

for (const { framework, path, selector } of POSTER_SKINS) {
  test(`hides a source-less poster image — ${framework}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });

    const posterImage = page.locator(selector).first();

    await expect(posterImage).toBeAttached();
    await posterImage.evaluate((image) => {
      image.removeAttribute('src');
      image.removeAttribute('srcset');
    });

    await expect(posterImage).toHaveCSS('visibility', 'hidden');
  });
}
