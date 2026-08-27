import { expect, type Locator, type Page, test } from '@playwright/test';

import { expectVisualParity, type VisualCapture } from '../fixtures/visual-parity';

interface StableRegion extends VisualCapture {
  readonly styles: StyleContract;
}

interface StyleContract {
  readonly root: LayoutStyle;
}

interface LayoutStyle {
  readonly display: string;
  readonly flex: string;
  readonly flexDirection: string;
  readonly font: string;
  readonly gap: string;
  readonly height: string;
  readonly inset: string;
  readonly margin: string;
  readonly opacity: string;
  readonly overflow: string;
  readonly padding: string;
  readonly position: string;
  readonly scale: string;
  readonly transform: string;
  readonly translate: string;
  readonly visibility: string;
  readonly width: string;
}

const CASES = [
  { framework: 'react', skin: 'default-video' },
  { framework: 'react', skin: 'minimal-video' },
  { framework: 'html', skin: 'default-video' },
  { framework: 'html', skin: 'minimal-video' },
] as const;
const WIDTHS = [320, 800] as const;
const CONTROLS_SELECTOR = '.media-controls--root, .media-controls';

for (const variant of CASES) {
  for (const width of WIDTHS) {
    test(`${variant.framework} ${variant.skin} ${width}px renders VJSC CSS like legacy`, async ({ page }, testInfo) => {
      const legacyRoot = await openVariant(page, variant, 'css', width, 'legacy');
      const legacy = await captureStableRegions(legacyRoot);
      const cssRoot = await openVariant(page, variant, 'css', width);
      const css = await captureStableRegions(cssRoot);

      expect(css.map(({ name }) => name)).toEqual(legacy.map(({ name }) => name));

      for (let index = 0; index < legacy.length; index += 1) {
        expect.soft(css[index]!.styles, `${css[index]!.name} computed styles`).toEqual(legacy[index]!.styles);
        await expectVisualParity(page, testInfo, legacy[index]!, css[index]!);
      }
    });

    test(`${variant.framework} ${variant.skin} ${width}px renders Tailwind like VJSC CSS`, async ({
      page,
    }, testInfo) => {
      const cssRoot = await openVariant(page, variant, 'css', width);
      const css = await captureStableRegions(cssRoot);
      const tailwindRoot = await openVariant(page, variant, 'tailwind', width);
      const tailwind = await captureStableRegions(tailwindRoot);

      expect(tailwind.map(({ name }) => name)).toEqual(css.map(({ name }) => name));

      for (let index = 0; index < css.length; index += 1) {
        expect.soft(tailwind[index]!.styles, `${tailwind[index]!.name} computed styles`).toEqual(css[index]!.styles);
        await expectVisualParity(page, testInfo, css[index]!, tailwind[index]!);
      }
    });
  }
}

async function openVariant(
  page: Page,
  variant: (typeof CASES)[number],
  style: 'css' | 'tailwind',
  width: number,
  source: 'legacy' | 'vjsc' = 'vjsc'
): Promise<Locator> {
  const query = new URLSearchParams({ source, ...variant, style });

  await page.goto(`/?${query}`, { waitUntil: 'domcontentloaded' });

  const root = page.getByRole('group', { name: 'Media player' });

  await expect(root).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await root.dispatchEvent('pointermove', { pointerType: 'mouse' });
  await root.evaluate((element, playerWidth) => {
    const tree = element.getRootNode();
    const sizingTarget = tree instanceof ShadowRoot ? tree.host : element;

    if (sizingTarget instanceof HTMLElement) sizingTarget.style.width = `${playerWidth}px`;
  }, width);
  await page.locator('video').evaluateAll((elements) => {
    for (const element of elements) {
      element.pause();
      element.currentTime = 0;
      element.style.visibility = 'hidden';
    }
  });
  await root.locator('img, media-poster').evaluateAll((elements) => {
    for (const element of elements) {
      if (element instanceof HTMLElement) element.style.visibility = 'hidden';
    }
  });
  await freezeSlider(timeSlider(root));
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  return root;
}

async function captureStableRegions(root: Locator): Promise<StableRegion[]> {
  const slider = timeSlider(root);

  const regions = [
    { name: 'player', target: root },
    { name: 'controls', target: root.locator(CONTROLS_SELECTOR).first() },
    { name: 'play-button', target: root.getByRole('button', { name: 'Play', exact: true }) },
    { name: 'time-slider', target: timeSlider(root) },
  ];
  const captures: StableRegion[] = [];

  for (const region of regions) {
    await freezeSlider(slider);

    if ((await region.target.count()) === 0 || !(await region.target.isVisible())) continue;

    const box = await region.target.boundingBox();
    if (!box || box.width === 0 || box.height === 0) continue;

    captures.push({
      name: region.name,
      image: await root.page().screenshot({ animations: 'disabled', caret: 'hide', clip: box, scale: 'css' }),
      styles: await styleContract(region.target),
    });
  }

  return captures;
}

async function freezeSlider(slider: Locator): Promise<void> {
  await slider.evaluate((element) => {
    for (const target of [element, ...element.querySelectorAll<HTMLElement>('*')]) {
      target.style.setProperty('--media-slider-fill', '0%', 'important');
      target.style.setProperty('--media-slider-buffer', '0%', 'important');
      target.style.setProperty('--media-slider-pointer', '0%', 'important');
    }
  });
}

function timeSlider(root: Locator): Locator {
  return root
    .getByRole('slider', { name: 'Seek' })
    .locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " media-slider ") or contains(concat(" ", normalize-space(@class), " "), " media-time-slider ") or contains(concat(" ", normalize-space(@class), " "), " group/slider ")][1]'
    );
}

async function styleContract(target: Locator): Promise<StyleContract> {
  return target.evaluate((element) => {
    const inspect = (style: CSSStyleDeclaration): LayoutStyle => {
      return {
        display: style.display,
        flex: style.flex,
        flexDirection: style.flexDirection,
        font: style.font,
        gap: style.gap,
        height: style.height,
        inset: style.inset,
        margin: style.margin,
        opacity: style.opacity,
        overflow: style.overflow,
        padding: style.padding,
        position: style.position,
        scale: style.scale,
        transform: style.transform,
        translate: style.translate,
        visibility: style.visibility,
        width: style.width,
      };
    };

    return {
      root: inspect(getComputedStyle(element)),
    };
  });
}
