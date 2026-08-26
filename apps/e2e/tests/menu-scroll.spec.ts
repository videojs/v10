import { type ElementHandle, expect, type Page, test } from '@playwright/test';

import { VIDEO_PAGES } from '../fixtures/media';
import { SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

const UI_VIDEO_PAGES = VIDEO_PAGES.filter(({ media }) => media === 'video');

type PanelHandle = ElementHandle<HTMLElement>;

/**
 * Resolve the on-screen menu panel once the submenu view transition settled.
 *
 * The transition briefly leaves two panels on screen and clips their overflow, so the panel is pinned to a handle to
 * keep every later read on one element.
 */
async function resolveActiveMenuPanel(page: Page, player: PlayerPage): Promise<PanelHandle> {
  await expect(page.locator(SELECTORS.activeMenuPanel)).toHaveCount(1);
  await expect
    .poll(() => player.activeMenuPanel.evaluate((element) => getComputedStyle(element).overflowY))
    .toBe('auto');

  const handle = await player.activeMenuPanel.elementHandle();
  if (!handle) throw new Error('Menu panel is not attached');

  return handle as PanelHandle;
}

/** Wait for the popover open animation to finish so pointer coordinates are meaningful. */
async function getStableBox(panel: PanelHandle): Promise<{ x: number; y: number; width: number; height: number }> {
  let previous = '';

  await expect
    .poll(async () => {
      const box = await panel.boundingBox();
      const key = box
        ? `${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)},${Math.round(box.height)}`
        : '';
      const settled = key !== '' && key === previous;

      previous = key;
      return settled;
    })
    .toBe(true);

  const box = await panel.boundingBox();
  if (!box) throw new Error('Menu panel is not visible');

  return box;
}

function getScrollTop(panel: PanelHandle): Promise<number> {
  return panel.evaluate((element) => Math.round(element.scrollTop));
}

function getHighlightedOption(panel: PanelHandle): Promise<string> {
  return panel.evaluate((element) => element.querySelector('[data-highlighted]')?.textContent?.trim() ?? '');
}

for (const { name, path } of UI_VIDEO_PAGES) {
  test.describe(`Menu scrolling — ${name} UI`, () => {
    let player: PlayerPage;
    let panel: PanelHandle;

    test.beforeEach(async ({ page }) => {
      player = new PlayerPage(page);
      await page.goto(path);
      await player.waitForMediaReady();
      await player.openPlaybackRateSettings();
      panel = await resolveActiveMenuPanel(page, player);
    });

    // Regression: Firefox scroll anchoring latched onto the anchor-positioned
    // highlight indicator, so every hover scrolled the list by one item.
    // https://github.com/videojs/v10/issues/2095
    test('hovering options keeps the scroll position', async ({ page }) => {
      const overflows = await panel.evaluate((element) => element.scrollHeight > element.clientHeight + 1);

      expect(overflows, 'speed menu must overflow for this test to be meaningful').toBe(true);

      const box = await getStableBox(panel);

      await panel.evaluate((element) => {
        element.scrollTop = element.scrollHeight - element.clientHeight;
      });
      const scrollTop = await getScrollTop(panel);

      expect(scrollTop).toBeGreaterThan(0);

      const centerX = box.x + box.width / 2;
      const bottom = box.height - 2;
      const middle = box.height / 2;

      /** Walk the pointer across options, recording what each step highlighted and scrolled. */
      async function walkPointer(from: number, to: number): Promise<{ highlights: Set<string>; scrolls: Set<number> }> {
        const step = from < to ? 4 : -4;
        const highlights = new Set<string>();
        const scrolls = new Set<number>();

        for (let offset = from; step > 0 ? offset <= to : offset >= to; offset += step) {
          await page.mouse.move(centerX, box.y + offset);
          await page.waitForTimeout(50);
          highlights.add(await getHighlightedOption(panel));
          scrolls.add(await getScrollTop(panel));
        }

        return { highlights, scrolls };
      }

      // Enter the list at the bottom and walk up, then back down.
      for (const walk of [await walkPointer(bottom, middle), await walkPointer(middle, bottom)]) {
        // The pointer crossed options, so the highlight must have followed it…
        expect(walk.highlights.size, [...walk.highlights].join(' | ')).toBeGreaterThan(1);
        // …without moving the list out from under the pointer.
        expect([...walk.scrolls]).toEqual([scrollTop]);
      }
    });

    test('uses the available menu space for size clamps', async () => {
      const size = await panel.evaluate((element) => {
        const menu = element.closest<HTMLElement>('.media-menu')!;
        const probe = menu.cloneNode(false);
        if (!(probe instanceof HTMLElement)) throw new Error('Menu probe is not an element');

        probe.removeAttribute('id');
        probe.removeAttribute('popover');
        probe.style.setProperty('--media-menu-max-height', '999px');
        probe.style.setProperty('--media-menu-available-width', '123px');
        probe.style.setProperty('--media-menu-available-height', '123px');
        probe.style.setProperty('--media-popover-available-width', '321px');
        probe.style.setProperty('--media-popover-available-height', '321px');
        menu.parentElement!.append(probe);

        const style = getComputedStyle(probe);
        const size = { maxWidth: style.maxWidth, maxHeight: style.maxHeight };

        probe.remove();
        return size;
      });

      expect(size).toEqual({ maxWidth: '123px', maxHeight: '123px' });
    });

    test('keyboard navigation still scrolls the highlighted option into view', async ({ page }) => {
      await getStableBox(panel);
      // Keys only reach the menu once the opened panel owns focus.
      await expect
        .poll(() =>
          panel.evaluate((element) => {
            const root = element.getRootNode() as Document | ShadowRoot;

            return element.contains(root.activeElement);
          })
        )
        .toBe(true);

      await panel.evaluate((element) => {
        element.scrollTop = 0;
      });

      await page.keyboard.press('End');

      await expect.poll(() => getScrollTop(panel)).toBeGreaterThan(0);
    });
  });
}
