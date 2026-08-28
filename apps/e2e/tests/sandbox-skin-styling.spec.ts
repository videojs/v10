import { expect, test } from '@playwright/test';

import { DATA_ATTRS } from '../fixtures/selectors';

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
    // The preview is `aria-hidden`, so `role=img` is the only hook the CSS and Tailwind skins share.
    const thumbnail = root.locator('[role="img"]').first();

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

    const after = await measure();

    expect(after.width).toBeGreaterThan(before.width);
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
      const family = `media-skin--live-${media}`;

      await expect(root).toBeVisible({ timeout: 15_000 });
      await expect(root).toHaveClass(new RegExp(`(?:^|\\s)${family}(?:\\s|$)`));
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
      const family = `media-skin--live-${media}`;

      await expect(root).toBeVisible({ timeout: 15_000 });
      await expect(page.locator(`live-${media}-player`)).toHaveCount(1);
      await expect(root).toHaveClass(new RegExp(`(?:^|\\s)${family}(?:\\s|$)`));
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

    const contract = await root.evaluate((element, mediaType) => {
      const popup = element.querySelector<HTMLElement>('[role="alertdialog"]');
      const controls = element.querySelector<HTMLElement>('.media-controls');
      if (!popup || !controls) throw new Error('Expected an error dialog and controls.');

      const rootRect = element.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      const controlsStyle = getComputedStyle(controls);

      return {
        controlsSuppressed:
          mediaType === 'video'
            ? controlsStyle.display === 'none'
            : [...controls.children].every((child) => getComputedStyle(child).visibility === 'hidden'),
        popupInside: popupRect.top >= rootRect.top && popupRect.bottom <= rootRect.bottom,
        rootHeight: rootRect.height,
      };
    }, media);

    expect(contract.controlsSuppressed).toBe(true);
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

// CSS styling only: the Tailwind output runs inside the consumer's own Tailwind build, which
// assumes a 16px root and Preflight, so host-page interference is the consumer's domain there.
const HOST_CSS_CASES = [
  { skin: 'default', styling: 'css', radius: '28px' },
  { skin: 'minimal', styling: 'css', radius: '12px' },
] as const;

// Element-selector rules and a non-default root font size, as commonly found on host pages
// embedding the light-DOM React skin.
const HOSTILE_HOST_CSS = `
  html { font-size: 62.5%; }
  button {
    margin: 7px;
    font-family: serif;
    text-transform: uppercase;
    letter-spacing: 4px;
    background: rgb(255, 0, 0);
    border: 6px dashed rgb(0, 255, 0);
  }
  svg { display: inline; margin: 9px; fill: rgb(255, 0, 0); }
  img, video { display: inline; margin: 9px; }
`;

for (const { skin, styling, radius } of HOST_CSS_CASES) {
  test(`react ${skin} ${styling} withstands host page element styles`, async ({ page }) => {
    const query = new URLSearchParams({
      styling,
      skin,
      source: 'mp4-1',
      autoplay: '0',
      muted: '1',
      loop: '0',
      preload: 'metadata',
    });

    await page.goto(`${SANDBOX_BASE}/react-video/?${query}`, { waitUntil: 'domcontentloaded' });

    const root = page.getByRole('group', { name: 'Media player' }).first();

    await expect(root).toBeVisible({ timeout: 15_000 });
    await page.addStyleTag({ content: HOSTILE_HOST_CSS });

    // Container sizing must not follow the host root font size.
    await expect(root).toHaveCSS('border-radius', radius);

    const playButton = page.getByRole('button', { name: 'Play' }).first();

    await expect(playButton).toHaveCSS('margin', '0px');
    await expect(playButton).toHaveCSS('text-transform', 'none');
    await expect(playButton).toHaveCSS('letter-spacing', 'normal');
    await expect(playButton).toHaveCSS('border-width', '0px');
    await expect(playButton).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

    const buttonStyles = await playButton.evaluate((element) => {
      const icon = element.querySelector('svg');
      if (!icon) throw new Error('Expected the play button to contain an icon.');

      const iconStyle = getComputedStyle(icon);

      return {
        fontFamily: getComputedStyle(element).fontFamily,
        iconDisplay: iconStyle.display,
        iconFillMatchesColor: iconStyle.fill === iconStyle.color,
        iconMargin: iconStyle.margin,
      };
    });

    expect(buttonStyles.fontFamily).toContain('Inter');
    expect(buttonStyles.iconDisplay).toBe('block');
    expect(buttonStyles.iconFillMatchesColor).toBe(true);
    expect(buttonStyles.iconMargin).toBe('0px');

    await expect(page.locator('video').first()).toHaveCSS('display', 'block');
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
