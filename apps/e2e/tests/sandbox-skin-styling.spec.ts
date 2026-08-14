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
