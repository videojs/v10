import { expect, type Locator, type Page, test } from '@playwright/test';

const CASES = [
  { framework: 'react', skin: 'default-audio' },
  { framework: 'react', skin: 'minimal-audio' },
  { framework: 'html', skin: 'default-audio' },
  { framework: 'html', skin: 'minimal-audio' },
] as const;
const STYLES = ['css', 'tailwind'] as const;
const WIDTHS = [384, 672] as const;

type Source = 'legacy' | 'vjsc';
type Style = (typeof STYLES)[number];
type Variant = (typeof CASES)[number];

test.describe.configure({ mode: 'serial' });

for (const variant of CASES) {
  test(`${variant.framework} ${variant.skin} keeps legacy, CSS, and Tailwind rendering in sync`, async ({ page }) => {
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
  });

  test(`${variant.framework} ${variant.skin} preserves audio interactions and popup styling`, async ({ page }) => {
    const contracts = [];

    for (const configuration of configurations()) {
      await test.step(`${configuration.source}/${configuration.style}`, async () => {
        const root = await openVariant(page, variant, configuration.style, 672, configuration.source);

        contracts.push(await interactionContract(page, root));
      });
    }

    for (const key of ['menu', 'popover', 'tooltip'] as const) {
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

    for (const configuration of configurations()) {
      await test.step(`${configuration.source}/${configuration.style}`, async () => {
        const root = await openVariant(page, variant, configuration.style, 672, configuration.source, 'error', false);
        const dialog = root.getByRole('alertdialog');

        await expect(dialog).toBeVisible({ timeout: 20_000 });
        contracts.push(await popupContract(dialog));
      });
    }

    expect(contracts[1]).toEqual(contracts[0]);
    expect(contracts[2]).toEqual(contracts[1]);
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
}

function configurations(): readonly { readonly source: Source; readonly style: Style }[] {
  return [
    { source: 'legacy', style: 'css' },
    { source: 'vjsc', style: 'css' },
    { source: 'vjsc', style: 'tailwind' },
  ];
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

  const tooltip = page.locator('[popover]:visible').filter({ hasText: 'Play' }).first();

  await expect(tooltip).toBeVisible();

  const tooltipContract = { visible: await tooltip.isVisible(), ...(await popupContract(tooltip)) };

  await page.mouse.move(0, 0);
  await expect(tooltip).toBeHidden();

  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Pause');
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Play');

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

  const popover = await popupAncestorContract(volume);

  await page.mouse.move(0, 0);
  await expect(volume).toBeHidden();

  return {
    menu: menuContract,
    nestedButtons: await root.locator('button button').count(),
    playbackRateChanged,
    popover,
    tooltip: tooltipContract,
  };
}

async function popupContract(popup: Locator) {
  return popup.evaluate((element) => {
    const style = getComputedStyle(element);
    const paintedShadow = style.boxShadow
      .split(/,(?![^()]*(?:\)|$))/)
      .some((shadow) => !/rgba?\([^)]*(?:\/|,)\s*0(?:\.0+)?\)/.test(shadow) && /-?[1-9]\d*(?:\.\d+)?px/.test(shadow));
    const durations = style.transitionDuration.split(',').map((value) => value.trim());
    const properties = style.transitionProperty.split(',').map((value) => value.trim());
    const motion = properties.flatMap((property, index) =>
      ['opacity', 'filter', 'transform', 'scale'].includes(property)
        ? [{ duration: durations[index % durations.length], property }]
        : []
    );

    return {
      backdropFilter: style.backdropFilter === 'none' ? 'none' : 'painted',
      background: style.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : 'painted',
      borderRadius: Number.parseFloat(style.borderRadius) > 50 ? 'pill' : style.borderRadius,
      motion,
      shadow: paintedShadow ? 'painted' : 'none',
    };
  });
}

async function popupAncestorContract(child: Locator) {
  return child.evaluate((element) => {
    const popup = element.closest(
      '.media-popover--volume, .media-volume-popover, [popover], media-popover, media-volume-popover'
    );
    if (!popup) throw new Error('Expected a popup ancestor.');

    const style = getComputedStyle(popup);
    const paintedShadow = style.boxShadow
      .split(/,(?![^()]*(?:\)|$))/)
      .some((shadow) => !/rgba?\([^)]*(?:\/|,)\s*0(?:\.0+)?\)/.test(shadow) && /-?[1-9]\d*(?:\.\d+)?px/.test(shadow));
    const durations = style.transitionDuration.split(',').map((value) => value.trim());
    const properties = style.transitionProperty.split(',').map((value) => value.trim());
    const motion = properties.flatMap((property, index) =>
      ['opacity', 'filter', 'transform', 'scale'].includes(property)
        ? [{ duration: durations[index % durations.length], property }]
        : []
    );

    return {
      backdropFilter: style.backdropFilter === 'none' ? 'none' : 'painted',
      background: style.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : 'painted',
      borderRadius: Number.parseFloat(style.borderRadius) > 50 ? 'pill' : style.borderRadius,
      motion,
      shadow: paintedShadow ? 'painted' : 'none',
    };
  });
}

function visibleMenuPopup(page: Page): Locator {
  return page
    .locator(
      '.media-menu:visible, .media-menu-popup:visible, [popover]:has(> [role="menu"]):visible, media-menu:has(> media-menu-content):visible, [role="menu"]:visible'
    )
    .first();
}
