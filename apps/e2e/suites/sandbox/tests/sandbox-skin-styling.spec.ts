import { expect, test } from '@playwright/test';

import { DATA_ATTRS, SELECTORS } from '../../../shared/fixtures/selectors';

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
const HTML_TAILWIND_ERROR_CASES = [
  { media: 'video', skin: 'default' },
  { media: 'video', skin: 'minimal' },
  { media: 'audio', skin: 'default' },
  { media: 'audio', skin: 'minimal' },
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
      platform === 'html' && styling === 'css' ? page.locator('video-skin, video-minimal-skin').first() : root;

    await host.evaluate((element) => {
      element.style.setProperty('--media-accent-color', '#123456');
      element.style.setProperty('--media-accent-text-color', '#abcdef');
      element.style.setProperty('--media-border-color', '#fe0102');
      element.style.setProperty('--media-border-radius', '18px');
      element.style.setProperty('--media-font-family', 'Courier New');
    });

    const settingsButton = page.getByRole('button', { name: 'Settings' }).first();

    await settingsButton.click();
    await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    await expect(settingsButton).toHaveCSS('color', 'rgb(171, 205, 239)');

    const styles = await root.evaluate((element) => {
      const accent = 'rgb(18, 52, 86)';
      const fillUsesAccent = [...element.querySelectorAll<HTMLElement>('[data-orientation]')].some(
        (part) => getComputedStyle(part).backgroundColor === accent
      );
      const style = getComputedStyle(element);

      return {
        borderRadius: style.borderRadius,
        borderUsesColor: getComputedStyle(element, '::after').boxShadow.includes('rgb(254, 1, 2)'),
        fillUsesAccent,
        fontFamily: style.fontFamily,
        videoBorderRadius: style.getPropertyValue('--media-video-border-radius').trim(),
      };
    });

    expect(styles).toEqual({
      borderRadius: '18px',
      borderUsesColor: true,
      fillUsesAccent: true,
      fontFamily: '"Courier New"',
      videoBorderRadius: '18px',
    });
  });

  test(`${platform} ${skin} ${styling} scales thumbnails in fullscreen`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });

    const query = new URLSearchParams({
      styling,
      skin,
      source: 'hls-1',
      autoplay: '0',
      muted: '1',
      loop: '0',
      preload: 'metadata',
    });

    await page.goto(`${SANDBOX_BASE}/${platform}-video/?${query}`, { waitUntil: 'domcontentloaded' });

    const root = page.getByRole('group', { name: 'Media player' }).first();
    const slider = page.getByRole('slider', { name: 'Seek' }).first().locator('..');
    const thumbnail = root.locator(SELECTORS.thumbnail).first();

    await expect(root).toBeVisible({ timeout: 15_000 });
    await slider.hover();
    await expect(thumbnail).toBeAttached({ timeout: 15_000 });
    await expect(thumbnail).not.toHaveAttribute(DATA_ATTRS.loading, { timeout: 15_000 });

    // Layout sizes, not bounding rects: the preview scales in over 150ms and a transform would skew the comparison.
    const measure = () =>
      thumbnail.evaluate((element) => {
        const image = element.shadowRoot?.querySelector('img') ?? element.querySelector('img');

        if (!(element instanceof HTMLElement) || !(image instanceof HTMLElement)) {
          throw new Error('Expected the thumbnail host and image to be HTML elements.');
        }

        const rect = element.getBoundingClientRect();
        const imageRect = image.getBoundingClientRect();

        return {
          width: element.offsetWidth,
          height: element.offsetHeight,
          maxWidth: parseFloat(getComputedStyle(element).maxWidth),
          rightGap: rect.right - imageRect.right,
          bottomGap: rect.bottom - imageRect.bottom,
        };
      });

    const before = await measure();

    const fullscreenButton = root.getByRole('button', { name: /full ?screen/i }).first();

    await fullscreenButton.click();
    await expect(fullscreenButton).toHaveAttribute(DATA_ATTRS.fullscreen, '');
    await slider.hover();

    // Fullscreen widens the preview through a container query, and the tile has to grow to fill it — less the 1px
    // anti-fringe inset on each edge.
    await expect.poll(async () => (await measure()).maxWidth).toBeGreaterThan(before.maxWidth);
    await expect
      .poll(async () => {
        const box = await measure();

        return box.maxWidth - box.width;
      })
      .toBeLessThanOrEqual(2);
    await expect.poll(async () => (await measure()).width).toBeGreaterThan(before.width);

    const after = await measure();

    // Aspect ratio survives the resize, so the tile is neither cropped nor letterboxed.
    expect(Math.abs(after.width / after.height - before.width / before.height)).toBeLessThan(0.02);
    // The sprite still covers the container that clips it.
    expect(after.rightGap).toBeLessThanOrEqual(0);
    expect(after.bottomGap).toBeLessThanOrEqual(0);
  });
}

for (const media of ['video', 'audio'] as const) {
  for (const { platform, skin, styling } of CASES) {
    test(`${platform} ${skin} ${styling} selects the live ${media} skin`, async ({ page }) => {
      const query = new URLSearchParams({
        styling,
        skin,
        source: 'hls-live',
        autoplay: '0',
        muted: '1',
        loop: '0',
        preload: 'metadata',
      });

      await page.goto(`${SANDBOX_BASE}/${platform}-hls-${media}/?${query}`, { waitUntil: 'domcontentloaded' });

      const root = page.getByRole('group', { name: 'Media player' }).first();

      await expect(root).toBeVisible({ timeout: 15_000 });
      await expect(root).toHaveAttribute('data-preset', `live-${media}`);
      await expect(page.getByRole('slider', { name: 'Seek' })).toHaveCount(0);
    });
  }
}

for (const media of ['video', 'audio'] as const) {
  for (const skin of ['default', 'minimal'] as const) {
    test(`cdn ${skin} selects the live ${media} skin`, async ({ page }) => {
      const query = new URLSearchParams({
        preset: `hls-${media}`,
        skin,
        source: 'hls-live',
        autoplay: '0',
        muted: '1',
        loop: '0',
        preload: 'metadata',
      });

      await page.goto(`${SANDBOX_BASE}/cdn/?${query}`, { waitUntil: 'domcontentloaded' });

      const root = page.getByRole('group', { name: 'Media player' }).first();

      await expect(root).toBeVisible({ timeout: 15_000 });
      await expect(page.locator(`live-${media}-player`)).toHaveCount(1);
      await expect(root).toHaveAttribute('data-preset', `live-${media}`);
      await expect(page.getByRole('slider', { name: 'Seek' })).toHaveCount(0);
    });
  }
}

for (const { media, skin } of HTML_TAILWIND_ERROR_CASES) {
  test(`html ${skin} tailwind ${media} contains the error dialog without changing the closed layout`, async ({
    page,
  }) => {
    const query = new URLSearchParams({
      styling: 'tailwind',
      skin,
      source: 'mp4-1',
      autoplay: '0',
      muted: '1',
      loop: '0',
      preload: 'metadata',
    });

    await page.goto(`${SANDBOX_BASE}/html-${media}/?${query}`, { waitUntil: 'domcontentloaded' });

    const root = page.getByRole('group', { name: 'Media player' }).first();

    await expect(root).toBeVisible({ timeout: 15_000 });
    await root.evaluate((element) => {
      if (element instanceof HTMLElement) element.style.width = '320px';
    });

    const popup = root.locator('media-error-dialog media-dialog-popup').first();
    const initialRootBox = await root.boundingBox();
    if (!initialRootBox) throw new Error('Expected the media player to have a rendered box.');

    await expect(popup).toBeHidden();
    await page
      .locator(media)
      .first()
      .evaluate((element) => {
        Object.defineProperty(element, 'error', {
          configurable: true,
          value: { code: 4, message: 'Test media error' },
        });
        element.dispatchEvent(new Event('error'));
      });
    await expect(popup).toBeVisible({ timeout: 15_000 });

    const contract = await root.evaluate((element) => {
      const popup = element.querySelector<HTMLElement>('[role="alertdialog"]');
      if (!popup) throw new Error('Expected an error dialog.');

      const rootRect = element.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();

      return {
        popupInside: popupRect.top >= rootRect.top && popupRect.bottom <= rootRect.bottom,
        rootHeight: rootRect.height,
      };
    });

    expect(contract.popupInside).toBe(true);
    expect(Math.abs(contract.rootHeight - initialRootBox.height)).toBeLessThanOrEqual(1);
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
    else await expect(muteTooltip).toBeHidden();

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
