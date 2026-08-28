import { expect, type Locator, type Page, test } from '@playwright/test';

import {
  buttonInteractionContract,
  collectPageErrors,
  emulatePreference,
  normalizeErrorDialogCopy,
  popupAncestor,
  popupContract,
  surfaceContract,
  VJSC_CONFIGURATIONS,
  waitForStableText,
  type VjscSource,
  type VjscStyle,
} from './vjsc-skin-parity';

const CASES = [
  { framework: 'react', skin: 'default-audio' },
  { framework: 'react', skin: 'minimal-audio' },
  { framework: 'html', skin: 'default-audio' },
  { framework: 'html', skin: 'minimal-audio' },
] as const;
const STYLES = ['css', 'tailwind'] as const;
const WIDTHS = [384, 672] as const;

type Source = VjscSource;
type Style = VjscStyle;
type Variant = (typeof CASES)[number];

test.describe.configure({ mode: 'serial' });

for (const variant of CASES) {
  test(`${variant.framework} ${variant.skin} keeps legacy, CSS, and Tailwind rendering in sync`, async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    for (const width of WIDTHS) {
      const name = `${variant.framework}-${variant.skin}-${width}.png`;
      const legacy = await openVariant(page, variant, 'css', width, 'legacy');
      const legacyContract = await layoutContract(legacy);

      await expect(legacy).toHaveScreenshot(name);

      const css = await openVariant(page, variant, 'css', width);
      const cssContract = await layoutContract(css);

      expect(cssContract).toEqual(legacyContract);
      await expect(css).toHaveScreenshot(name);

      const tailwind = await openVariant(page, variant, 'tailwind', width);
      const tailwindContract = await layoutContract(tailwind);

      expect(tailwindContract).toEqual(cssContract);
      await expect(tailwind).toHaveScreenshot(name);
    }

    expect(pageErrors).toEqual([]);
  });

  test(`${variant.framework} ${variant.skin} preserves audio interactions and popup styling`, async ({ page }) => {
    const contracts = [];

    for (const configuration of VJSC_CONFIGURATIONS) {
      await test.step(`${configuration.source}/${configuration.style}`, async () => {
        const root = await openVariant(page, variant, configuration.style, 672, configuration.source);

        contracts.push(await interactionContract(page, root));
      });
    }

    for (const key of ['button', 'hover', 'menu', 'popover', 'tooltip'] as const) {
      expect(contracts[1][key], `${key}: VJSC CSS matches legacy`).toEqual(contracts[0][key]);
      expect(contracts[2][key], `${key}: VJSC Tailwind matches CSS`).toEqual(contracts[1][key]);
    }

    expect(contracts[1]).toMatchObject({
      nestedButtons: 0,
      playbackRateChanged: true,
      tooltip: { visible: true },
    });
  });

  test(`${variant.framework} ${variant.skin} keeps error-dialog styling in sync`, async ({ page }) => {
    const contracts = [];

    for (const configuration of VJSC_CONFIGURATIONS) {
      await test.step(`${configuration.source}/${configuration.style}`, async () => {
        const root = await openVariant(page, variant, configuration.style, 672, configuration.source, 'error', false);
        const dialog = root.getByRole('alertdialog');

        await expect(dialog).toBeVisible({ timeout: 20_000 });
        await waitForStableText(dialog);
        await normalizeErrorDialogCopy(dialog);
        contracts.push(await popupContract(dialog));
      });
    }

    expect(contracts[1]).toEqual(contracts[0]);
    expect(contracts[2]).toEqual(contracts[1]);
  });

  test(`${variant.framework} ${variant.skin} keeps seek preview and dragging in sync`, async ({ page }) => {
    const contracts = [];

    for (const configuration of VJSC_CONFIGURATIONS) {
      await test.step(`${configuration.source}/${configuration.style}`, async () => {
        await openVariant(page, variant, configuration.style, 672, configuration.source);
        contracts.push(await audioSeekContract(page));
      });
    }

    expect(contracts[1]).toEqual(contracts[0]);
    expect(contracts[2]).toEqual(contracts[1]);
    expect(contracts[1]).toMatchObject({
      dragging: { fillIsImmediate: true, lag: 0, thumbPositionIsImmediate: true },
      restingFillTransitions: true,
    });
    expect(contracts[1].previewOffsets.every((offset) => Math.abs(offset) <= 1)).toBe(true);
  });

  test(`${variant.framework} ${variant.skin} removes movement under reduced motion`, async ({ page }) => {
    for (const style of STYLES) {
      const root = await openVariant(page, variant, style, 672);

      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);

      const button = root.getByRole('button', { name: /Playback rate/i });

      await button.click();
      await expect(button).toHaveAttribute('aria-expanded', 'true');

      const popup = visibleMenuPopup(page);
      const motion = await popup.evaluate((element) => {
        const style = getComputedStyle(element);

        return {
          animation: style.animationName,
          duration: style.transitionDuration,
          scale: style.scale,
        };
      });

      expect(motion).toEqual({ animation: 'none', duration: '0s', scale: 'none' });
    }
  });

  for (const preference of ['reduced-transparency', 'contrast-more', 'forced-colors'] as const) {
    test(`${variant.framework} ${variant.skin} keeps ${preference} surfaces in sync`, async ({ page }) => {
      await emulatePreference(page, preference);

      const contracts = [];

      for (const configuration of VJSC_CONFIGURATIONS) {
        const root = await openVariant(page, variant, configuration.style, 672, configuration.source);
        const rate = root.getByRole('button', { name: /Playback rate/i });

        await rate.click();
        await expect(rate).toHaveAttribute('aria-expanded', 'true');

        contracts.push({
          controls: await surfaceContract(root.locator('.media-controls').first()),
          popup: await surfaceContract(visibleMenuPopup(page)),
        });
      }

      expect(contracts[1]).toEqual(contracts[0]);
      expect(contracts[2]).toEqual(contracts[1]);
    });
  }
}

async function openVariant(
  page: Page,
  variant: Variant,
  style: Style,
  width: number,
  source: Source = 'vjsc',
  media = 'mp4-1',
  expectPlay = true
): Promise<Locator> {
  const query = new URLSearchParams({ source, ...variant, style, media, width: String(width) });

  await page.goto(`/?${query}`, { waitUntil: 'domcontentloaded' });

  const root = page.getByRole('group', { name: 'Media player' });

  await expect(root).toBeVisible();

  if (expectPlay) await expect(root.getByRole('button', { name: 'Play', exact: true })).toBeVisible();

  await expect.poll(() => root.evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(width);
  await root.evaluate((element) => {
    if (!(element instanceof HTMLElement)) return;

    const { top } = element.getBoundingClientRect();

    element.style.translate = `0 ${Math.round(top) - top}px`;
  });
  await root.locator('audio').evaluateAll((elements) => {
    for (const element of elements) {
      element.pause();
      element.currentTime = 0;
    }
  });
  await root
    .getByRole('slider', { name: 'Seek' })
    .locator('..')
    .evaluateAll((elements) => {
      for (const element of elements) {
        if (!(element instanceof HTMLElement)) continue;

        element.style.setProperty('--media-slider-fill', '0%', 'important');
        element.style.setProperty('--media-slider-buffer', '0%', 'important');
        element.style.setProperty('--media-slider-pointer', '0%', 'important');
      }
    });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  return root;
}

async function layoutContract(root: Locator) {
  const rootRect = await root.boundingBox();
  const slider = root.getByRole('slider', { name: 'Seek' }).locator('..');

  if (!rootRect) throw new Error('Expected an audio skin root.');

  const roundValue = (value: number) => Math.round(value * 2) / 2;
  const relativeRect = async (target: Locator) => {
    const rect = await target.boundingBox();
    if (!rect) throw new Error('Expected a visible audio skin part.');

    return {
      height: roundValue(rect.height),
      left: roundValue(rect.x - rootRect.x),
      top: roundValue(rect.y - rootRect.y),
      width: roundValue(rect.width),
    };
  };
  const relativeBox = (rect: { height: number; width: number; x: number; y: number }) => ({
    height: roundValue(rect.height),
    left: roundValue(rect.x - rootRect.x),
    top: roundValue(rect.y - rootRect.y),
    width: roundValue(rect.width),
  });
  const buttons = [];

  for (const button of await root.getByRole('button').all()) {
    const popup = await button.evaluate(
      (element) => element.closest('[role=menu], [role=dialog], [role=alertdialog]') !== null
    );
    if (popup || !(await button.isVisible())) continue;

    buttons.push({ label: await button.getAttribute('aria-label'), rect: await relativeRect(button) });
  }

  const classedControls = root.locator('.media-controls').first();
  const tooltipGroup = root.locator('media-tooltip-group').first();
  const controlsLocator = (await classedControls.count()) > 0 ? classedControls : tooltipGroup.locator('..');
  const controls =
    (await controlsLocator.count()) > 0
      ? await controlsLocator.evaluate(readControls)
      : await root.getByRole('button', { name: 'Play', exact: true }).evaluate((element) => {
          let controls = element.parentElement;

          while (
            controls &&
            !(controls.querySelector('[aria-label^="Mute"]') && controls.querySelector('[aria-label="Seek"]'))
          ) {
            controls = controls.parentElement;
          }

          if (!controls) throw new Error('Expected audio controls.');

          const rect = controls.getBoundingClientRect();
          const style = getComputedStyle(controls);

          return {
            rect: { height: rect.height, width: rect.width, x: rect.x, y: rect.y },
            style: {
              backdropFilter: style.backdropFilter,
              backgroundColor: style.backgroundColor,
              borderRadius: Number.parseFloat(style.borderRadius) > 50 ? 'pill' : style.borderRadius,
              boxShadow: style.boxShadow === 'none' ? 'none' : 'painted',
              color: style.color,
              display: style.display,
              gap: style.gap,
              padding: style.padding,
            },
          };
        });

  function readControls(element: Element) {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);

    return {
      rect: { height: rect.height, width: rect.width, x: rect.x, y: rect.y },
      style: {
        backdropFilter: style.backdropFilter,
        backgroundColor: style.backgroundColor,
        borderRadius: Number.parseFloat(style.borderRadius) > 50 ? 'pill' : style.borderRadius,
        boxShadow: style.boxShadow === 'none' ? 'none' : 'painted',
        color: style.color,
        display: style.display,
        gap: style.gap,
        padding: style.padding,
      },
    };
  }

  return {
    buttons,
    controls: {
      rect: relativeBox(controls.rect),
      style: controls.style,
    },
    root: { height: roundValue(rootRect.height), width: roundValue(rootRect.width) },
    slider: await relativeRect(slider),
  };
}

async function interactionContract(page: Page, root: Locator) {
  const play = root.getByRole('button', { name: /^(?:Play|Pause)$/ });

  await play.hover();
  await page.waitForTimeout(200);

  const hover = await play.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      background: /\/\s*0(?:\.0+)?\)/.test(style.backgroundColor) ? 'transparent' : 'painted',
      color: style.color,
    };
  });

  const tooltip = page.locator('[popover]:visible').filter({ hasText: 'Play' }).first();

  await expect(tooltip).toBeVisible();

  const tooltipContract = { visible: await tooltip.isVisible(), ...(await popupContract(tooltip)) };

  await page.mouse.move(0, 0);
  await expect(tooltip).toBeHidden();

  await play.hover();
  await expect(tooltip).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(tooltip).toBeHidden();

  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Play');

  const button = await buttonInteractionContract(page, play);

  const rate = root.getByRole('button', { name: /Playback rate/i });
  const initialRate = await rate.getAttribute('data-rate');

  await rate.click();
  await expect(rate).toHaveAttribute('aria-expanded', 'true');

  const menu = root.getByRole('menu');
  const menuPopup = visibleMenuPopup(page);
  const alternative = menu.locator('[role="menuitemradio"]:not([aria-checked="true"])').last();

  await expect(menu).toBeVisible();
  const menuContract = await popupContract(menuPopup);

  await alternative.click();
  await expect.poll(() => rate.getAttribute('data-rate')).not.toBe(initialRate);

  const playbackRateChanged = (await rate.getAttribute('data-rate')) !== initialRate;

  const mute = root.getByRole('button', { name: /mute/i });

  await mute.hover();

  const volume = root.getByRole('slider', { name: /volume/i });

  await expect(volume).toBeVisible();

  const popover = await popupContract(popupAncestor(volume));

  await page.mouse.move(0, 0);
  await expect(volume).toBeHidden();

  await mute.hover();
  await expect(volume).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(volume).toBeHidden();

  return {
    button,
    hover,
    menu: menuContract,
    nestedButtons: await root.locator('button button').count(),
    playbackRateChanged,
    popover,
    tooltip: tooltipContract,
  };
}

async function audioSeekContract(page: Page) {
  const thumb = page.getByRole('slider', { name: 'Seek' });
  const slider = thumb.locator('..');

  await slider.evaluate((element) => {
    for (const name of ['--media-slider-fill', '--media-slider-buffer', '--media-slider-pointer']) {
      if (element instanceof HTMLElement) element.style.removeProperty(name);
    }
  });

  const previewOffsets: number[] = [];

  for (const ratio of [0.25, 0.75]) {
    const box = await slider.boundingBox();
    if (!box) throw new Error('Expected the audio seek slider to have a rendered box.');

    const pointer = box.x + box.width * ratio;

    await slider.hover({ position: { x: box.width * ratio, y: box.height / 2 } });
    await expect(slider).toHaveAttribute('data-pointing', '');

    const preview = slider.locator(':scope > :last-child > :last-child');
    const previewBox = await preview.boundingBox();
    if (!previewBox) throw new Error('Expected the audio seek preview to have a rendered box.');

    const offset = Math.round((previewBox.x + previewBox.width / 2 - pointer) * 10) / 10;

    previewOffsets.push(Math.abs(offset) < 0.1 ? 0 : offset);
  }

  const restingFillTransitions = await slider.evaluate((element) =>
    [...element.querySelectorAll('*')]
      .map((target) => getComputedStyle(target))
      .filter((style) =>
        style.transitionProperty
          .split(',')
          .map((value) => value.trim())
          .includes('clip-path')
      )
      .every((style) => style.transitionDuration.split(',').some((duration) => Number.parseFloat(duration) > 0))
  );
  const box = await slider.boundingBox();
  if (!box) throw new Error('Expected the audio seek slider to have a rendered box.');

  const pointerX = box.x + box.width * 0.73;
  const pointerY = box.y + box.height / 2;

  await page.mouse.move(box.x + box.width * 0.25, pointerY);
  await page.mouse.down();
  await page.mouse.move(pointerX, pointerY);
  await expect(slider).toHaveAttribute('data-dragging', '');

  const dragging = await thumb.evaluate((element, expectedX) => {
    const style = getComputedStyle(element);
    const root = element.parentElement;
    const fills = [...(root?.querySelectorAll('*') ?? [])]
      .map((target) => getComputedStyle(target))
      .filter((candidate) =>
        candidate.transitionProperty
          .split(',')
          .map((value) => value.trim())
          .includes('clip-path')
      );
    const rect = element.getBoundingClientRect();
    const lag = Math.abs(rect.x + rect.width / 2 - expectedX);
    const positionProperties = new Set(style.transitionProperty.split(',').map((value) => value.trim()));
    const fillDurations = fills.flatMap((candidate) =>
      candidate.transitionDuration.split(',').map((value) => Number.parseFloat(value))
    );

    return {
      fillIsImmediate: fillDurations.length > 0 && fillDurations.every((duration) => duration === 0),
      lag: lag <= 1 ? 0 : Math.ceil(lag),
      thumbPositionIsImmediate: !positionProperties.has('left') && !positionProperties.has('top'),
    };
  }, pointerX);

  await page.mouse.up();
  return { dragging, previewOffsets, restingFillTransitions };
}

function visibleMenuPopup(page: Page): Locator {
  return page
    .locator(
      '.media-menu:visible, .media-menu-popup:visible, [popover]:has(> [role="menu"]):visible, media-menu:has(> media-menu-content):visible, [role="menu"]:visible'
    )
    .first();
}
