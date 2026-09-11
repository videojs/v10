import { expect, type Page, test } from '@playwright/test';

const PAGES = [
  'source-html-video-mp4',
  'source-react-video-mp4',
  'html-video-mp4',
  'react-video-mp4',
  'html-video-minimal-mp4',
  'react-video-minimal-mp4',
] as const;

for (const name of PAGES) {
  for (const dpr of [1, 2]) {
    test.describe(`${name} at DPR ${dpr}`, () => {
      test.use({ deviceScaleFactor: dpr });

      test('keeps media edges clear, letterboxes black, and outside focus visible', async ({ page }) => {
        await page.route('https://image.mux.com/**/thumbnail*', (route) =>
          route.fulfill({
            contentType: 'image/svg+xml',
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><path fill="white" d="M0 0H320V180H0Z"/></svg>',
          })
        );
        await page.route('https://stream.mux.com/**/highest.mp4', (route) =>
          route.fulfill({
            contentType: 'video/mp4',
            headers: { 'Access-Control-Allow-Origin': '*' },
            path: new URL('../../../shared/fixtures/media/white.mp4', import.meta.url).pathname,
          })
        );
        await page.goto(`/pages/${name}.html`);

        const root = page.locator('.media-container').first();
        const video = page.locator('video').first();
        const image = page.locator('img[slot="poster"], media-poster img, .media-poster img').first();

        await expect(root).toBeVisible();
        await image.evaluate((element: HTMLImageElement) => element.decode());
        await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState)).toBeGreaterThan(1);
        await page.addStyleTag({ content: 'body { margin: 0; background: #f8f8f8; }' });
        await root.evaluate((element: HTMLElement) => {
          element.style.setProperty('--media-border-radius', '14px');
          element.style.setProperty('--media-border-color', 'transparent');

          // Isolate media edges from intentionally dark controls, scrims, and the player frame.
          for (const child of element.children) {
            if (child instanceof HTMLElement && !child.matches('video, slot, media-poster, .media-poster')) {
              child.style.visibility = 'hidden';
            }
          }
        });

        for (const state of ['poster', 'video']) {
          if (state === 'video') {
            await video.evaluate(async (element: HTMLVideoElement) => {
              element.muted = true;
              element.loop = true;
              await element.play();
            });
            await expect(page.locator('media-poster, .media-poster').first()).toHaveCSS('opacity', '0');
          }

          for (const offset of [0, 0.25]) {
            // Include fractional position and dimensions, not just integer-aligned corners.
            await root.evaluate((element: HTMLElement, offset) => {
              const tree = element.getRootNode();
              const target = tree instanceof ShadowRoot && tree.host instanceof HTMLElement ? tree.host : element;

              Object.assign(target.style, {
                position: 'absolute',
                left: `${40 + offset}px`,
                top: `${40 + offset}px`,
                width: `${320 + offset}px`,
                height: `${180 + (offset * 9) / 16}px`,
                maxWidth: 'none',
              });
            }, offset);
            const pixels = await edgePixels(page, dpr);

            expect(pixels.center, `${state} should contain the white fixture`).toBeGreaterThanOrEqual(250);
            expect(pixels.minimum, `${state} edges at offset ${offset}`).toBeGreaterThanOrEqual(247);
          }
        }

        await root.evaluate((element: HTMLElement) => {
          element.style.setProperty('--media-ring', 'red');
          const before = document.createElement('button');

          before.dataset.focusBefore = '';
          element.before(before);
        });
        await page.locator('[data-focus-before]').focus();
        await page.keyboard.press('Tab');
        await expect(root).toBeFocused();
        expect((await edgePixels(page, dpr)).red, 'Outside keyboard focus ring must remain visible').toBeGreaterThan(
          100
        );

        // A forced square aspect ratio must retain black bars around the 16:9 video.
        await root.evaluate((element: HTMLElement) => {
          element.parentNode?.querySelector('[data-focus-before]')?.remove();
          element.blur();
          const tree = element.getRootNode();
          const target = tree instanceof ShadowRoot && tree.host instanceof HTMLElement ? tree.host : element;

          target.style.height = '320px';
        });
        expect((await edgePixels(page, dpr)).letterbox, 'Letterbox background must remain black').toBeLessThan(5);

        await root.evaluate((element: HTMLElement) => {
          for (const child of element.children) {
            if (child instanceof HTMLElement) child.style.visibility = 'hidden';
          }
        });
        expect((await edgePixels(page, dpr)).center, 'Empty player background must remain black').toBeLessThan(5);
      });
    });
  }
}

async function edgePixels(page: Page, dpr: number) {
  // Capture the surrounding page too: an element screenshot can omit the outer antialiased pixels.
  const image = await page.screenshot({ clip: { x: 34, y: 34, width: 333, height: 193 }, animations: 'disabled' });

  return page.evaluate(
    async ({ source, dpr }) => {
      const image = new Image();

      image.src = source;
      await image.decode();
      const canvas = document.createElement('canvas');

      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d')!;

      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, image.width, image.height);
      let minimum = 255;
      let red = 0;

      for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
          const index = (y * image.width + x) * 4;

          if (data[index]! > 240 && data[index + 1]! < 20 && data[index + 2]! < 20) red++;

          if (x < 18 * dpr || y < 18 * dpr || x >= image.width - 18 * dpr || y >= image.height - 18 * dpr) {
            minimum = Math.min(minimum, data[(y * image.width + x) * 4]!);
          }
        }
      }

      return {
        minimum,
        red,
        letterbox: data[(20 * dpr * image.width + Math.floor(image.width / 2)) * 4]!,
        center: data[(Math.floor(image.height / 2) * image.width + Math.floor(image.width / 2)) * 4]!,
      };
    },
    { source: `data:image/png;base64,${image.toString('base64')}`, dpr }
  );
}
