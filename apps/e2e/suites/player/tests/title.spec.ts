import { expect, test } from '@playwright/test';

for (const framework of ['html', 'react']) {
  for (const skin of ['default', 'minimal']) {
    test(`title updates and hides when empty (${framework}, ${skin})`, async ({ page }) => {
      await page.goto(`/title.html?framework=${framework}&skin=${skin}`);

      const title = page.locator('.media-title');
      const content = title.locator(':scope > .media-title-content');
      const input = page.getByRole('textbox', { name: 'Title' });

      await expect(title).toHaveText('A long video title that should stay clear of the player controls');
      await expect(title).toBeVisible();
      expect(await title.evaluate((element) => element.tagName)).toBe(framework === 'html' ? 'MEDIA-TITLE' : 'DIV');
      await expect(page.locator('.media-metadata')).toHaveCount(0);
      await expect(title).toHaveAttribute('class', 'media-title');
      await expect(content).toHaveAttribute('class', 'media-title-content');
      expect(await content.evaluate((element) => element.tagName)).toBe(
        framework === 'html' ? 'MEDIA-TITLE-VALUE' : 'DIV'
      );
      await expect(title.locator(':scope > *')).toHaveCount(1);
      expect(await title.evaluate((element) => getComputedStyle(element, '::before').content)).toBe('none');
      expect(await title.evaluate((element) => element.parentElement?.classList.contains('media-container'))).toBe(
        true
      );
      await expect(title).toHaveAttribute('data-visible');
      await expect(title).toHaveCSS('opacity', '1');
      await expect(content).toHaveCSS('white-space', 'normal');
      await expect(content).toHaveCSS('overflow-wrap', 'anywhere');
      await expect(title).not.toHaveAttribute('title');
      await expect(title).not.toHaveAttribute('aria-hidden', 'true');

      if (skin === 'default') {
        const titleEnd = await content.evaluate((element) => {
          const style = getComputedStyle(element);

          return element.getBoundingClientRect().right - parseFloat(style.paddingRight);
        });
        const buttons = await page.locator('.video-controls-secondary').boundingBox();

        expect(titleEnd).toBeLessThanOrEqual(buttons!.x);
      }

      const container = page.locator('.media-container');
      const gradient = await title.evaluate((element) => getComputedStyle(element).backgroundImage);

      expect(gradient).toContain('linear-gradient');
      await container.evaluate((element: HTMLElement) =>
        element.style.setProperty('--media-controls-gradient', 'none')
      );
      expect(await title.evaluate((element) => getComputedStyle(element).backgroundImage)).toBe(gradient);
      await container.evaluate((element: HTMLElement) => element.style.removeProperty('--media-controls-gradient'));
      expect((await title.boundingBox())!.height).toBeCloseTo((await container.boundingBox())!.height, 0);

      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await page.mouse.move(600, 400);
      await expect(container).not.toHaveAttribute('data-controls-visible');
      await expect(title).not.toHaveAttribute('data-visible');
      await expect(title).toHaveCSS('opacity', '0');
      const hidden = await title.evaluate((element) => {
        const style = getComputedStyle(element);

        return { translate: style.translate, scale: style.scale };
      });

      expect(hidden.translate).toMatch(/-/);

      if (skin === 'default') expect(hidden.scale).not.toBe('1');
      else {
        const bounds = await title.boundingBox();
        const frame = await container.boundingBox();

        const button = await page.locator('.media-play-button').boundingBox();

        expect(frame!.y - bounds!.y).toBeCloseTo(button!.height, 0);
        await expect(title).toHaveCSS('transition-property', 'filter, opacity, translate');
      }

      await container.hover();
      await expect(title).toHaveAttribute('data-visible');
      await expect(title).toHaveCSS('opacity', '1');
      await page.getByRole('button', { name: 'Pause', exact: true }).click();

      await page.emulateMedia({ reducedMotion: 'reduce' });
      expect(
        await title.evaluate((element) => parseFloat(getComputedStyle(element).transitionDuration))
      ).toBeLessThanOrEqual(0.025);
      await expect(title).toHaveCSS('--media-hidden-offset', '0px');

      await input.fill('Updated title');
      await expect(title).toHaveText('Updated title');
      await input.fill('');
      await expect(title).toBeHidden();
      await input.fill('Restored title');
      await expect(title).toBeVisible();
      await expect(title).toHaveText('Restored title');
    });
  }
}
