import { expect, type Frame, type Page, test } from '@playwright/test';

const SANDBOX_BASE = process.env.SANDBOX_URL ?? 'http://localhost:5299';

const QUERY = 'skin=default&source=mp4-1&autoplay=0&muted=1&loop=0&preload=metadata';

test.use({ trace: 'off' });

async function getPanelFrame(page: Page, id: string): Promise<Frame> {
  const iframe = page.locator(`iframe[data-panel="${id}"]`);

  await expect(iframe).toBeVisible();

  const url = await iframe.getAttribute('src');
  if (!url) throw new Error(`Panel ${id} has no frame URL.`);

  await expect
    .poll(() =>
      page
        .frames()
        .find((frame) => frame.url().endsWith(url))
        ?.url()
    )
    .toBeDefined();

  const frame = page.frames().find((frame) => frame.url().endsWith(url));
  if (!frame) throw new Error(`Panel ${id} frame not found.`);

  return frame;
}

async function playerBox(frame: Frame) {
  const root = frame.getByRole('group', { name: 'Media player' }).first();

  await expect(root).toBeVisible({ timeout: 15_000 });

  const box = await root.boundingBox();
  if (!box) throw new Error('Expected the media player to have a rendered box.');

  return box;
}

test.describe('Sandbox compare', () => {
  test('compares the two stylings side by side with one width', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(`${SANDBOX_BASE}/?platform=react&media=video&compare=styling&layout=row&width=480&${QUERY}`, {
      waitUntil: 'domcontentloaded',
    });

    const css = page.locator('iframe[data-panel="css"]');
    const tailwind = page.locator('iframe[data-panel="tailwind"]');

    await expect(css).toHaveAttribute('src', /styling=css/);
    await expect(css).toHaveAttribute('src', /skins=package/);
    await expect(tailwind).toHaveAttribute('src', /styling=tailwind/);
    await expect(tailwind).toHaveAttribute('src', /skins=registry/);
    await expect(page.locator('[data-panel="css"] header')).toHaveText(/CSS/);
    await expect(page.locator('[data-panel="tailwind"] header')).toHaveText(/Tailwind/);

    const [left, right] = await Promise.all([
      playerBox(await getPanelFrame(page, 'css')),
      playerBox(await getPanelFrame(page, 'tailwind')),
    ]);

    expect(Math.round(left.width)).toBe(480);
    expect(Math.round(right.width)).toBe(480);

    const [cssBox, tailwindBox] = await Promise.all([css.boundingBox(), tailwind.boundingBox()]);

    expect(cssBox && tailwindBox && cssBox.x + cssBox.width <= tailwindBox.x).toBe(true);
    expect(cssBox && tailwindBox && Math.abs(cssBox.y - tailwindBox.y) < 2).toBe(true);
  });

  test('stacks the html and react players when asked', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/?platform=html&media=video&compare=platform&layout=column&${QUERY}`, {
      waitUntil: 'domcontentloaded',
    });

    const html = page.locator('iframe[data-panel="html"]');
    const react = page.locator('iframe[data-panel="react"]');

    await expect(html).toHaveAttribute('src', /^\/html-video\//);
    await expect(react).toHaveAttribute('src', /^\/react-video\//);

    await playerBox(await getPanelFrame(page, 'html'));

    const [htmlBox, reactBox] = await Promise.all([html.boundingBox(), react.boundingBox()]);

    expect(htmlBox && reactBox && htmlBox.y + htmlBox.height <= reactBox.y).toBe(true);
    expect(htmlBox && reactBox && Math.abs(htmlBox.x - reactBox.x) < 2).toBe(true);
    await expect(page.getByRole('radio', { name: 'Stacked' })).toHaveAttribute('aria-checked', 'true');
  });

  test('states the selection and switches compare off for a media without a skin choice', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/?platform=react&media=mux-video&compare=skin&${QUERY}`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByTestId('selection-summary')).toHaveText(
      /React · Mux Video · Default · CSS · from the package/
    );
    await expect(page.locator('iframe[data-panel]')).toHaveCount(2);

    await page.getByLabel('Media').selectOption('background-video');

    await expect(page.locator('iframe[data-panel]')).toHaveCount(1);
    await expect(page).not.toHaveURL(/[?&]compare=/);
    await expect(page.getByTestId('selection-summary')).toHaveText(/React · Background Video · fixed source/);
  });
});
