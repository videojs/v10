import { expect, type Locator, test } from '@playwright/test';

import { openComparison, type SkinCase } from './vjsc-skin-parity';

export function testRtlLayout(cases: readonly SkinCase[]) {
  for (const variant of cases) {
    test(`${variant.framework} ${variant.skin} preserves physical control order in RTL across styles`, async ({
      page,
    }) => {
      for (const width of [384, 800]) {
        const { panels } = await openComparison(page, { ...variant, width }, async ({ root, section }) => {
          await expect
            .poll(() =>
              section
                .locator('video, audio')
                .first()
                .evaluate((media: HTMLMediaElement) => media.readyState)
            )
            .toBeGreaterThan(0);
          await root.dispatchEvent('pointermove', { pointerType: 'mouse' });
        });

        const orders: string[][] = [];

        for (const { frame, root } of panels) {
          const before = await controlOrder(root);

          expect(before.length).toBeGreaterThan(1);
          orders.push(before);

          await frame.evaluate(() => window.postMessage({ type: 'dir-change', dir: 'rtl' }, '*'));
          await expect(root).toHaveCSS('direction', 'rtl');
          await root.dispatchEvent('pointermove', { pointerType: 'mouse' });
          await expect.poll(() => controlOrder(root)).toEqual(before);
        }

        expect(orders[1]).toEqual(orders[0]);
      }
    });
  }
}

async function controlOrder(root: Locator) {
  return root.getByRole('button').evaluateAll((buttons) =>
    buttons
      .map((button) => ({
        name: button.getAttribute('aria-label') ?? button.textContent?.trim() ?? '',
        rect: button.getBoundingClientRect(),
        visible: getComputedStyle(button).visibility === 'visible',
      }))
      .filter(({ rect, visible }) => visible && rect.width > 0 && rect.height > 0)
      .sort((a, b) => a.rect.x - b.rect.x || a.rect.y - b.rect.y)
      .map(({ name }) => name)
  );
}
