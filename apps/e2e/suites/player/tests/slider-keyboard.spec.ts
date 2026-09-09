import { expect, test } from '@playwright/test';

import { VIDEO_PAGES } from '../../../shared/fixtures/media';
import { DATA_ATTRS } from '../../../shared/fixtures/selectors';
import { holdVolumeKey, neverReverses, stays } from '../../../shared/fixtures/volume-slider';
import { PlayerPage } from '../../../shared/page-objects/player';

for (const { name, path } of VIDEO_PAGES.filter(({ resource }) => resource === 'mp4')) {
  test.describe(`Slider keyboard input — ${name}`, () => {
    test('keeps repeated volume keys within range', async ({ page }) => {
      await page.addInitScript(() => {
        const forwarded = new WeakSet<Event>();

        document.addEventListener(
          'volumechange',
          (event) => {
            if (forwarded.has(event)) return;

            event.stopImmediatePropagation();

            setTimeout(() => {
              const next = new Event('volumechange');

              forwarded.add(next);
              event.target?.dispatchEvent(next);
            }, 100);
          },
          true
        );
      });

      const player = new PlayerPage(page);

      await page.goto(path);
      await player.waitForMediaReady({ muted: false });
      await player.muteButton.hover();
      await player.volumeSliderThumb.focus();
      await page.waitForTimeout(300);

      for (const [key, value] of [
        ['ArrowDown', 0],
        ['ArrowUp', 100],
      ] as const) {
        const result = await holdVolumeKey(page, player.volumeSlider, key);
        const direction = key === 'ArrowUp' ? 'up' : 'down';

        await expect(player.volumeSliderThumb).toHaveAttribute('aria-valuenow', String(value));
        expect(neverReverses(result.frames, direction), JSON.stringify(result.frames)).toBe(true);
        expect(Math.min(...result.frames)).toBeGreaterThanOrEqual(-0.01);
        expect(Math.max(...result.frames)).toBeLessThanOrEqual(100.01);
        expect(Math.min(...result.gaps), JSON.stringify(result.gaps)).toBeGreaterThanOrEqual(-0.02);
        expect(stays(result.release, result.beforeRelease), JSON.stringify(result.release)).toBe(true);
      }
    });

    test('keeps controls visible while a volume key is held', async ({ page }) => {
      const player = new PlayerPage(page);

      await page.goto(path);
      await player.waitForMediaReady();
      await player.play();
      await player.muteButton.hover();
      await player.volumeSliderThumb.focus();
      await expect(player.volumeSliderThumb).toBeFocused();
      await page.keyboard.down('ArrowDown');

      try {
        for (let index = 0; index < 8; index++) {
          await page.waitForTimeout(500);
          await page.keyboard.down('ArrowDown');
        }

        await expect(player.controls).toHaveAttribute(DATA_ATTRS.visible, '');
      } finally {
        await page.keyboard.up('ArrowDown');
      }
    });
  });
}
