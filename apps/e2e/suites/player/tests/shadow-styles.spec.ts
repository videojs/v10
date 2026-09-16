import { expect, test } from '@playwright/test';

import { PlayerPage } from '../../../shared/page-objects/player';

test('Packaged skin interpolates progress and isolates media spacing', async ({ page }) => {
  await page.goto('/pages/html-video-mp4.html');
  const player = new PlayerPage(page);

  await player.waitForMediaReady();

  await page.addStyleTag({ content: 'video { margin: 2em !important; }' });
  await expect(page.locator('video-player video')).toHaveCSS('margin', '0px');

  const progress = await page.locator('media-time-slider').evaluate((slider) => {
    const animation = slider.animate([{ '--media-slider-fill': '0%' }, { '--media-slider-fill': '100%' }], {
      duration: 1000,
      fill: 'both',
    });

    animation.pause();
    animation.currentTime = 500;
    const value = parseFloat(getComputedStyle(slider).getPropertyValue('--media-slider-fill'));

    animation.cancel();

    return value;
  });

  expect(progress).toBeCloseTo(50);
});
