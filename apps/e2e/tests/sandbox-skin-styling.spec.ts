import { expect, test } from '@playwright/test';

const SANDBOX_BASE = process.env.SANDBOX_URL ?? 'http://localhost:5299';

const CASES = [
  { platform: 'html', skin: 'default', styling: 'css' },
  { platform: 'html', skin: 'minimal', styling: 'css' },
  { platform: 'html', skin: 'default', styling: 'tailwind' },
  { platform: 'html', skin: 'minimal', styling: 'tailwind' },
  { platform: 'react', skin: 'default', styling: 'css' },
  { platform: 'react', skin: 'minimal', styling: 'css' },
  { platform: 'react', skin: 'default', styling: 'tailwind' },
  { platform: 'react', skin: 'minimal', styling: 'tailwind' },
] as const;

test.use({ trace: 'off' });
test.describe.configure({ mode: 'serial' });

for (const { platform, skin, styling } of CASES) {
  test(`${platform} ${skin} ${styling} uses public skin properties`, async ({ page }) => {
    const query = new URLSearchParams({
      styling,
      skin,
      source: 'mp4-1',
      autoplay: '0',
      muted: '1',
      loop: '0',
      preload: 'metadata',
    });

    await page.goto(`${SANDBOX_BASE}/${platform}-video/?${query}`, { waitUntil: 'domcontentloaded' });

    const root = page.getByRole('group', { name: 'Media player' }).first();

    await expect(root).toBeVisible({ timeout: 15_000 });

    const host =
      platform === 'html'
        ? page.locator('video-skin, video-minimal-skin, video-skin-tailwind, video-minimal-skin-tailwind').first()
        : root;

    await host.evaluate((element) => {
      element.style.setProperty('--media-accent-color', '#123456');
      element.style.setProperty('--media-accent-text-color', '#abcdef');
      element.style.setProperty('--media-border-radius', '18px');
    });

    const playButton = page.getByRole('button', { name: 'Play' }).first();

    await playButton.hover();
    await expect(playButton).toHaveCSS('color', 'rgb(171, 205, 239)');

    const styles = await root.evaluate((element) => {
      const accent = 'rgb(18, 52, 86)';
      const fillUsesAccent = [...element.querySelectorAll<HTMLElement>('[data-orientation]')].some(
        (part) => getComputedStyle(part).backgroundColor === accent
      );
      const style = getComputedStyle(element);

      return {
        borderRadius: style.borderRadius,
        fillUsesAccent,
        videoBorderRadius: style.getPropertyValue('--media-video-border-radius').trim(),
      };
    });

    expect(styles).toEqual({
      borderRadius: '18px',
      fillUsesAccent: true,
      videoBorderRadius: '18px',
    });
  });
}

for (const { platform, skin, styling } of CASES) {
  test(`${platform} ${skin} ${styling} opens the volume popover`, async ({ page }) => {
    const query = new URLSearchParams({
      styling,
      skin,
      source: 'mp4-1',
      autoplay: '0',
      muted: '1',
      loop: '0',
      preload: 'metadata',
    });

    await page.goto(`${SANDBOX_BASE}/${platform}-video/?${query}`, { waitUntil: 'domcontentloaded' });

    const root = page.getByRole('group', { name: 'Media player' }).first();

    await expect(root).toBeVisible({ timeout: 15_000 });

    const muteButton = page.getByRole('button', { name: 'Unmute' }).first();

    await muteButton.hover();
    const muteTooltip = page.locator('[popover="manual"]').filter({ hasText: 'Unmute' }).first();

    if (skin === 'minimal') await expect(muteTooltip).toBeVisible();
    else await expect(muteTooltip).toHaveCount(0);

    const volumeThumb = page.getByRole('slider', { name: 'Volume' }).first();

    await expect(volumeThumb).toBeVisible();
    await expect(volumeThumb).toHaveCSS('opacity', '1');
    await expect(volumeThumb).toHaveCSS('scale', '1');

    if (skin === 'minimal') await expect(muteTooltip).toBeVisible();

    await muteButton.focus();
    await page.keyboard.press('Tab');

    await expect(volumeThumb).toBeFocused();
    await expect(volumeThumb).toHaveCSS('opacity', '1');
    await expect(volumeThumb).toHaveCSS('scale', '1');
  });
}

for (const styling of ['css', 'tailwind'] as const) {
  test(`html minimal ${styling} keeps the thumbnail inside the player`, async ({ page }) => {
    const query = new URLSearchParams({
      styling,
      skin: 'minimal',
      source: 'hls-1',
      autoplay: '0',
      muted: '1',
      loop: '0',
      preload: 'metadata',
    });

    await page.goto(`${SANDBOX_BASE}/html-video/?${query}`, { waitUntil: 'domcontentloaded' });

    const root = page.getByRole('group', { name: 'Media player' }).first();
    const slider = page.getByRole('slider', { name: 'Seek' }).first();

    await expect(root).toBeVisible({ timeout: 15_000 });
    await expect(slider).toBeVisible();

    const sliderBox = await slider.boundingBox();
    if (!sliderBox) throw new Error('Time slider is not visible');

    const thumbnailImage = page.locator('media-slider-thumbnail').first();
    const thumbnail = thumbnailImage.locator('xpath=..');

    for (const x of [sliderBox.x + 1, sliderBox.x + sliderBox.width - 1]) {
      await page.mouse.move(x, sliderBox.y + sliderBox.height / 2);
      await expect(thumbnailImage).toBeAttached({ timeout: 15_000 });
      await expect(thumbnailImage).not.toHaveAttribute('data-loading', { timeout: 15_000 });
      await expect(thumbnail).toHaveCSS('scale', '1');

      const [rootBox, thumbnailBox] = await Promise.all([root.boundingBox(), thumbnail.boundingBox()]);
      if (!rootBox || !thumbnailBox) throw new Error('Player or thumbnail is not visible');

      expect(thumbnailBox.x).toBeGreaterThanOrEqual(rootBox.x - 1);
      expect(thumbnailBox.x + thumbnailBox.width).toBeLessThanOrEqual(rootBox.x + rootBox.width + 1);
    }
  });
}
