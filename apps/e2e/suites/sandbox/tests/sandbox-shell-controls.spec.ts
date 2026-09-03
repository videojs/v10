import { expect, type Frame, type Page, test } from '@playwright/test';

const SANDBOX_BASE = process.env.SANDBOX_URL ?? 'http://localhost:5299';

const QUERY = 'styling=css&skin=default&source=mp4-1&autoplay=0&muted=1&loop=0&preload=metadata';

test.use({ trace: 'off' });

async function getPreviewFrame(page: Page, path: string): Promise<Frame> {
  await expect(page.locator('iframe[title="player demo"]')).toHaveAttribute('src', new RegExp(`^${path}`));
  await expect
    .poll(() =>
      page
        .frames()
        .find((frame) => frame.url().includes(path))
        ?.url()
    )
    .toContain(path);

  const frame = page.frames().find((frame) => frame.url().includes(path));
  if (!frame) throw new Error(`Preview frame not found: ${path}`);

  return frame;
}

/** The width control lives in the options panel, which opens closed. */
async function openOptions(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByRole('complementary', { name: 'Options' })).toBeVisible();
}

async function playerWidth(scope: Page | Frame): Promise<number> {
  const root = scope.getByRole('group', { name: 'Media player' }).first();

  await expect(root).toBeVisible({ timeout: 15_000 });

  const box = await root.boundingBox();
  if (!box) throw new Error('Expected the media player to have a rendered box.');

  return Math.round(box.width);
}

test.describe('Sandbox shell controls', () => {
  test('the width control sizes the player in the preview', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/?platform=html&media=video&width=480&${QUERY}`, {
      waitUntil: 'domcontentloaded',
    });

    const frame = await getPreviewFrame(page, '/html-video/');

    await openOptions(page);

    const slider = page.getByRole('slider', { name: 'Width' });

    await expect(slider).toHaveValue('480');
    await expect.poll(() => playerWidth(frame)).toBe(480);

    await slider.fill('640');

    await expect(page).toHaveURL(/[?&]width=640(?:&|$)/);
    await expect.poll(() => playerWidth(frame)).toBe(640);
  });

  test('a preview opens at its skin width until the control is touched', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/?platform=react&media=audio&${QUERY}`, { waitUntil: 'domcontentloaded' });

    const frame = await getPreviewFrame(page, '/react-audio/');

    await openOptions(page);
    await expect(page.getByRole('slider', { name: 'Width' })).toHaveValue('576');
    await expect.poll(() => playerWidth(frame)).toBe(576);
    await expect(page).not.toHaveURL(/[?&]width=/);
  });

  test('a direct page takes width, scheme, and direction from its query', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/react-video/?width=400&scheme=dark&dir=rtl&${QUERY}`, {
      waitUntil: 'domcontentloaded',
    });

    const html = page.locator('html');
    const root = page.getByRole('group', { name: 'Media player' }).first();

    await expect.poll(() => playerWidth(page)).toBe(400);
    await expect(html).toHaveAttribute('data-color-scheme', 'dark');
    await expect(html).toHaveCSS('color-scheme', 'dark');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(root).toHaveCSS('direction', 'rtl');
  });

  test('a pinned direction outlives the locale', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/html-video/?locale=ar&dir=ltr&${QUERY}`, { waitUntil: 'domcontentloaded' });

    const html = page.locator('html');

    await expect(html).toHaveAttribute('lang', 'ar');
    await expect(html).toHaveAttribute('dir', 'ltr');
  });

  test('the scheme and direction settings reach the shell and the preview', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/?platform=html&media=video&${QUERY}`, { waitUntil: 'domcontentloaded' });

    const frame = await getPreviewFrame(page, '/html-video/');
    const root = frame.getByRole('group', { name: 'Media player' }).first();

    await expect(root).toBeVisible({ timeout: 15_000 });
    await expect(root).toHaveCSS('direction', 'ltr');

    await openOptions(page);
    await page.getByLabel('Direction').selectOption('rtl');

    await expect(frame.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(root).toHaveCSS('direction', 'rtl');
    await expect(page).toHaveURL(/[?&]dir=rtl(?:&|$)/);

    await page.getByLabel('Color scheme').selectOption('light');

    await expect(page.locator('html')).toHaveAttribute('data-color-scheme', 'light');
    await expect(frame.locator('html')).toHaveAttribute('data-color-scheme', 'light');
    await expect(frame.locator('html')).toHaveCSS('color-scheme', 'light');
    await expect(page).toHaveURL(/[?&]scheme=light(?:&|$)/);
  });
});
