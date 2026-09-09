import { expect, test } from '@playwright/test';

import { VIDEO_PAGES } from '../../../shared/fixtures/media';
import { MEDIA } from '../../../shared/fixtures/resources';
import { PlayerPage } from '../../../shared/page-objects/player';

for (const { name, path } of VIDEO_PAGES.filter(({ resource }) => resource === 'mp4')) {
  test(`${name} enables the timeline when metadata arrives`, async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });

    await page.route(MEDIA.mp4.url, async (route) => {
      await pending;
      await route.continue();
    });

    const player = new PlayerPage(page);

    await page.goto(path, { waitUntil: 'domcontentloaded' });

    try {
      await expect(player.timeSliderThumb).toHaveAttribute('aria-disabled', 'true');
      await expect(player.timeSliderThumb).toHaveAttribute('tabindex', '-1');
      await expect(player.timeSlider).toHaveCSS('pointer-events', 'none');
      await expect(player.timeToggle).toHaveAttribute('aria-disabled', 'true');
      await expect(player.timeToggle).toHaveAttribute('tabindex', '-1');
      await expect(player.timeToggle).toHaveCSS('opacity', '0.5');
    } finally {
      release();
    }

    await player.waitForMediaReady();
    await expect(player.timeSliderThumb).not.toHaveAttribute('aria-disabled', 'true');
    await expect(player.timeSliderThumb).toHaveAttribute('tabindex', '0');
    await expect(player.timeSlider).toHaveCSS('pointer-events', 'auto');
    await expect(player.timeToggle).not.toHaveAttribute('aria-disabled', 'true');
    await expect(player.timeToggle).toHaveAttribute('tabindex', '0');
    await expect(player.timeToggle).toHaveCSS('opacity', '1');
  });
}
