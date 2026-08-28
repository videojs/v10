import { expect, type Locator, type Page, test } from '@playwright/test';

const CASES = [
  { framework: 'react', skin: 'default-live-video' },
  { framework: 'react', skin: 'minimal-live-video' },
  { framework: 'html', skin: 'default-live-video' },
  { framework: 'html', skin: 'minimal-live-video' },
] as const;
const STYLES = ['css', 'tailwind'] as const;
const WIDTHS = [384, 680] as const;

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

  test(`${variant.framework} ${variant.skin} preserves live controls and popup motion`, async ({ page }) => {
    const contracts = [];

    for (const configuration of configurations()) {
      await test.step(`${configuration.source}/${configuration.style}`, async () => {
        const root = await openVariant(page, variant, configuration.style, 672, configuration.source);

        contracts.push(await interactionContract(page, root));
      });
    }

    expect(contracts[1]).toEqual(contracts[0]);
    expect(contracts[2]).toEqual(contracts[1]);
    expect(contracts[1]).toMatchObject({
      nestedButtons: 0,
      noPlaybackRate: true,
      noSeek: true,
      popover: { visible: true },
      tooltip: { visible: true },
    });
  });

  test(`${variant.framework} ${variant.skin} toggles one captions track and opens a menu for multiple`, async ({
    page,
  }) => {
    for (const configuration of configurations()) {
      await test.step(`${configuration.source}/${configuration.style}`, async () => {
        const single = await openVariant(page, variant, configuration.style, 672, configuration.source, 'single');
        const singleButton = await captionsButton(single);

        await singleButton.click();
        await expect(singleButton).toHaveAttribute('data-active', '');
        await expect(page.getByRole('menu')).toHaveCount(0);

        const multiple = await openVariant(page, variant, configuration.style, 672, configuration.source, 'multiple');
        const multipleButton = await captionsButton(multiple);

        await multipleButton.click();
        await expect(multipleButton).toHaveAttribute('aria-expanded', 'true');

        const menu = page.getByRole('menu');

        await expect(menu).toBeVisible();
        await expect(menu.getByRole('menuitemradio')).toHaveCount(3);
      });
    }
  });

  test(`${variant.framework} ${variant.skin} keeps fullscreen layout in sync`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const legacy = await openVariant(page, variant, 'css', 800, 'legacy');
    const legacyContract = await enterFullscreen(page, legacy);

    await expect(legacy).toHaveScreenshot(`${variant.framework}-${variant.skin}-fullscreen.png`);
    await exitFullscreen(page);

    const css = await openVariant(page, variant, 'css', 800);
    const cssContract = await enterFullscreen(page, css);

    expect(cssContract).toEqual(legacyContract);
    await expect(css).toHaveScreenshot(`${variant.framework}-${variant.skin}-fullscreen.png`);
    await exitFullscreen(page);

    const tailwind = await openVariant(page, variant, 'tailwind', 800);

    expect(await enterFullscreen(page, tailwind)).toEqual(cssContract);
    await expect(tailwind).toHaveScreenshot(`${variant.framework}-${variant.skin}-fullscreen.png`);
    await exitFullscreen(page);
  });

  test(`${variant.framework} ${variant.skin} removes movement under reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    for (const style of STYLES) {
      const root = await openVariant(page, variant, style, 672, 'vjsc', 'multiple');
      const button = await captionsButton(root);

      await button.click();
      await expect(button).toHaveAttribute('aria-expanded', 'true');

      const menu = page.getByRole('menu');
      const motion = await transitionContract(menu);

      expect(motion.movement.every(({ duration }) => duration === '0s')).toBe(true);
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
  captions: 'single' | 'multiple' = 'single'
): Promise<Locator> {
  const query = new URLSearchParams({
    source,
    ...variant,
    style,
    media: 'hls-live',
    captions,
    width: String(width),
  });

  await page.goto(`/?${query}`, { waitUntil: 'domcontentloaded' });

  const root = page.getByRole('group', { name: 'Media player' });

  await expect(root).toBeVisible();
  await expect(root.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(root.getByRole('button', { name: /live/i })).toBeVisible({ timeout: 20_000 });
  await root.dispatchEvent('pointermove', { pointerType: 'mouse' });
  await expect
    .poll(() =>
      root.evaluate((element) => {
        const tree = element.getRootNode();
        const sizingTarget = tree instanceof ShadowRoot ? tree.host : element;

        return Math.round(sizingTarget.getBoundingClientRect().width);
      })
    )
    .toBe(width);
  await root.evaluate((element, playerWidth) => {
    const tree = element.getRootNode();
    const sizingTarget = tree instanceof ShadowRoot ? tree.host : element;
    if (!(sizingTarget instanceof HTMLElement)) return;

    sizingTarget.style.height = `${Math.round((playerWidth * 9) / 16)}px`;

    const { top } = sizingTarget.getBoundingClientRect();

    sizingTarget.style.translate = `0 ${Math.round(top) - top}px`;
  }, width);
  await root.evaluate((element) => {
    const hideMedia = (tree: ParentNode) => {
      for (const child of tree.querySelectorAll<HTMLElement>('*')) {
        if (child instanceof HTMLVideoElement || child instanceof HTMLImageElement) child.style.visibility = 'hidden';

        if (child.shadowRoot) hideMedia(child.shadowRoot);
      }
    };

    element.style.setProperty('background', 'linear-gradient(135deg, #111827, #334155)', 'important');
    hideMedia(element);
  });
  await page.locator('video, mux-video, media-poster, img').evaluateAll((elements) => {
    for (const element of elements) {
      if (element instanceof HTMLElement) element.style.setProperty('visibility', 'hidden', 'important');
    }
  });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  return root;
}

async function captionsButton(root: Locator): Promise<Locator> {
  const button = root.getByRole('button', { name: /captions/i }).first();

  await expect(button).toHaveAttribute('data-availability', 'available');

  return button;
}

async function layoutContract(root: Locator) {
  return root.evaluate((element) => {
    const rootRect = element.getBoundingClientRect();
    const round = (value: number) => Math.round(value * 2) / 2;
    const relativeRect = (target: Element) => {
      const rect = target.getBoundingClientRect();

      return {
        height: round(rect.height),
        left: round(rect.x - rootRect.x),
        top: round(rect.y - rootRect.y),
        width: round(rect.width),
      };
    };
    const controls = [
      ...element.querySelectorAll<HTMLElement>(
        '.media-controls--primary, .media-controls-primary, [class~="origin-bottom"], media-controls-content.media-controls, .media-controls'
      ),
    ].find((candidate) => {
      const rect = candidate.getBoundingClientRect();

      return getComputedStyle(candidate).display !== 'contents' && rect.width > 0 && rect.height > 0;
    });
    if (!controls) throw new Error('Expected visible live video controls.');

    const controlsStyle = getComputedStyle(controls);
    const live = element.querySelector<HTMLElement>('[data-live-edge], [aria-label="Seek to live edge"]');
    if (!live) throw new Error('Expected a live button.');

    const liveStyle = getComputedStyle(live);
    const liveBefore = getComputedStyle(live, '::before');
    const buttons = [...element.querySelectorAll<HTMLElement>('[role=button]')]
      .filter((button) => {
        const rect = button.getBoundingClientRect();

        return rect.width > 0 && rect.height > 0 && !button.closest('[role=menu], [role=dialog], [role=alertdialog]');
      })
      .map((button) => ({
        label: button === live ? 'live' : button.getAttribute('aria-label'),
        rect: relativeRect(button),
      }));

    return {
      buttons,
      controls: {
        background: controlsStyle.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : 'painted',
        borderRadius: controlsStyle.borderRadius,
        display: controlsStyle.display,
        padding: controlsStyle.padding,
      },
      controlsRect: relativeRect(controls),
      live: {
        before: { display: liveBefore.display, width: liveBefore.width },
        fontSize: liveStyle.fontSize,
        gap: liveStyle.gap,
        padding: liveStyle.padding,
      },
      root: { height: round(rootRect.height), width: round(rootRect.width) },
    };
  });
}

async function interactionContract(page: Page, root: Locator) {
  const play = root.getByRole('button', { name: 'Play', exact: true });

  await play.hover();

  const tooltip = page.locator('[popover]:visible').filter({ hasText: 'Play' }).first();

  await expect(tooltip).toBeVisible();
  const tooltipContract = { visible: true, ...(await popupContract(tooltip)) };

  await page.mouse.move(0, 0);
  await expect(tooltip).toBeHidden();

  const mute = root.getByRole('button', { name: /mute/i });

  await mute.hover();

  const volume = root.getByRole('slider', { name: /volume/i });

  await expect(volume).toBeVisible();
  const popover = { visible: true, ...(await popupContract(volume.locator('xpath=ancestor::*[@popover][1]'))) };

  return {
    nestedButtons: await root.locator('button button').count(),
    noPlaybackRate: (await root.getByRole('button', { name: /playback rate/i }).count()) === 0,
    noSeek: (await root.getByRole('slider', { name: 'Seek' }).count()) === 0,
    popover,
    tooltip: tooltipContract,
  };
}

async function popupContract(popup: Locator) {
  const style = await popup.evaluate((element) => {
    const computed = getComputedStyle(element);
    const shadowLengths = [...computed.boxShadow.matchAll(/(-?\d*\.?\d+)px/g)].map((match) => Number(match[1]));

    return {
      backdropFilter: computed.backdropFilter === 'none' ? 'none' : 'painted',
      background: computed.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : 'painted',
      borderRadius: Number.parseFloat(computed.borderRadius) > 50 ? 'pill' : computed.borderRadius,
      shadow: shadowLengths.some((value) => value !== 0) ? 'painted' : 'none',
    };
  });

  return { ...style, ...(await transitionContract(popup)) };
}

async function transitionContract(target: Locator) {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    const durations = style.transitionDuration.split(',').map((value) => value.trim());

    return {
      movement: style.transitionProperty
        .split(',')
        .map((property) => property.trim())
        .flatMap((property, index) =>
          ['opacity', 'filter', 'transform', 'scale'].includes(property)
            ? [{ duration: durations[index % durations.length] ?? '0s', property }]
            : []
        ),
    };
  });
}

async function enterFullscreen(page: Page, root: Locator) {
  await root.evaluate((element) => {
    const tree = element.getRootNode();
    const sizingTarget = tree instanceof ShadowRoot ? tree.host : element;
    if (!(sizingTarget instanceof HTMLElement)) return;

    sizingTarget.style.height = '';
    sizingTarget.style.translate = '';
  });

  const button = root.getByRole('button', { name: /full ?screen/i }).first();

  await button.click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  await page.waitForTimeout(300);

  return root.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const controls = element.querySelector<HTMLElement>('.media-controls');
    const controlsRect = controls?.getBoundingClientRect();

    return {
      controls: controlsRect
        ? {
            bottom: Math.round(rect.bottom - controlsRect.bottom),
            height: Math.round(controlsRect.height),
            width: Math.round(controlsRect.width),
          }
        : null,
      root: {
        borderRadius: style.borderRadius,
        fontSize: style.fontSize,
        height: Math.round(rect.height),
        width: Math.round(rect.width),
      },
      scale: Number.parseFloat(style.getPropertyValue('--media-scale')),
    };
  });
}

async function exitFullscreen(page: Page) {
  await page.evaluate(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
  });
}
