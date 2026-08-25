import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo, test } from '@playwright/test';

import { PlayerPage } from '../page-objects/player';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

const PLAYER_PAGES = [
  { name: 'HTML video', path: '/pages/html-video-mp4.html' },
  { name: 'React video', path: '/pages/react-video-mp4.html' },
  { name: 'HTML audio', path: '/pages/html-audio-mp4.html' },
  { name: 'React audio', path: '/pages/react-audio-mp4.html' },
] as const;

const VIDEO_PAGES = PLAYER_PAGES.filter(({ name }) => name.endsWith('video'));

async function checkAccessibility(page: Page, testInfo: TestInfo, state: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

  await testInfo.attach(`axe-${state}`, {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });

  const violations = results.violations.map(({ id, impact, help, nodes }) => ({
    id,
    impact,
    help,
    targets: nodes.map(({ target }) => target),
  }));

  expect(violations, `${state} has automatically detectable accessibility violations`).toEqual([]);

  const brokenControls = await page.locator('[aria-controls]').evaluateAll((elements) =>
    elements.flatMap((element) => {
      const root = element.getRootNode() as Document | ShadowRoot;

      return (element.getAttribute('aria-controls') ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .filter((id) => !root.getElementById(id))
        .map((id) => ({ id, element: element.outerHTML }));
    })
  );

  expect(brokenControls, `${state} has unresolved aria-controls references`).toEqual([]);
}

test.describe('Accessibility', () => {
  for (const entry of PLAYER_PAGES) {
    test(`${entry.name} initial state`, async ({ page }, testInfo) => {
      const player = new PlayerPage(page);

      await page.goto(entry.path);
      await player.waitForMediaReady();

      await checkAccessibility(page, testInfo, `${entry.name}-initial`);
    });
  }

  for (const entry of VIDEO_PAGES) {
    test(`${entry.name} settings menu`, async ({ page }, testInfo) => {
      const player = new PlayerPage(page);

      await page.goto(entry.path);
      await player.waitForMediaReady();
      await player.showControls();
      await player.settingsButton.click();
      await expect(player.settingsSpeedItem).toBeVisible();

      await checkAccessibility(page, testInfo, `${entry.name}-settings`);
    });

    test(`${entry.name} playback rate menu`, async ({ page }, testInfo) => {
      const player = new PlayerPage(page);

      await page.goto(entry.path);
      await player.waitForMediaReady();
      await player.openPlaybackRateSettings();

      await checkAccessibility(page, testInfo, `${entry.name}-playback-rate`);
    });
  }
});
