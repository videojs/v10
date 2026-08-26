import { expect, type Locator, type Page, test } from '@playwright/test';

const CASES = [
  { framework: 'react', skin: 'default-video' },
  { framework: 'react', skin: 'minimal-video' },
  { framework: 'html', skin: 'default-video' },
  { framework: 'html', skin: 'minimal-video' },
] as const;
const WIDTHS = [320, 800] as const;
const BUFFERING_INDICATOR_SELECTOR =
  '.media-buffering-indicator, media-buffering-indicator, [class~="peer/buffering"], [class~="hidden"][class~="place-content-center"]';
const CONTROLS_SELECTOR = 'media-controls-content.media-controls, .media-controls';

test.describe.configure({ mode: 'serial' });

for (const variant of CASES) {
  test(`${variant.framework} ${variant.skin} matches the legacy CSS layout`, async ({ page }) => {
    for (const width of WIDTHS) {
      const legacy = await openVariant(page, variant, 'css', width, 'legacy');
      const legacyContract = await layoutContract(legacy);

      const vjsc = await openVariant(page, variant, 'css', width);
      const vjscContract = await layoutContract(vjsc);

      expect(vjscContract).toEqual(legacyContract);
    }
  });

  test(`${variant.framework} ${variant.skin} keeps legacy, CSS, and Tailwind rendering in sync`, async ({ page }) => {
    for (const width of WIDTHS) {
      const legacy = await openVariant(page, variant, 'css', width, 'legacy');

      await expect(legacy).toHaveScreenshot(snapshotName(variant, width));

      const css = await openVariant(page, variant, 'css', width);
      const cssContract = await skinContract(css);

      await expect(css).toHaveScreenshot(snapshotName(variant, width));

      const tailwind = await openVariant(page, variant, 'tailwind', width);
      const tailwindContract = await skinContract(tailwind);

      expect(tailwindContract).toEqual(cssContract);
      await expect(tailwind).toHaveScreenshot(snapshotName(variant, width));
    }
  });

  test(`${variant.framework} ${variant.skin} keeps button interaction styling in sync`, async ({ page }) => {
    const name = `${variant.framework}-${variant.skin}-button-focus.png`;

    const legacyRoot = await openVariant(page, variant, 'css', 800, 'legacy');
    const legacyRootFocus = await focusContract(legacyRoot);
    const legacyButton = await focusPlayButton(page);
    const legacyFocused = await buttonStateContract(legacyButton);

    await expect(legacyRoot).toHaveScreenshot(name);
    const legacyDisabled = await disabledButtonContract(legacyButton);
    const legacyPressed = await pressedButtonContract(page, legacyButton);

    const cssRoot = await openVariant(page, variant, 'css', 800);

    expect(await focusContract(cssRoot)).toEqual(legacyRootFocus);
    const cssButton = await focusPlayButton(page);
    const cssFocused = await buttonStateContract(cssButton);

    expect(cssFocused).toEqual(legacyFocused);
    await expect(cssRoot).toHaveScreenshot(name);
    expect(await disabledButtonContract(cssButton)).toEqual(legacyDisabled);
    expect(await pressedButtonContract(page, cssButton)).toEqual(legacyPressed);

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);

    expect(await focusContract(tailwindRoot)).toEqual(legacyRootFocus);
    const tailwindButton = await focusPlayButton(page);
    const tailwindFocused = await buttonStateContract(tailwindButton);

    expect(tailwindFocused).toEqual(cssFocused);
    await expect(tailwindRoot).toHaveScreenshot(name);
    expect(await disabledButtonContract(tailwindButton)).toEqual(legacyDisabled);
    expect(await pressedButtonContract(page, tailwindButton)).toEqual(legacyPressed);
  });

  test(`${variant.framework} ${variant.skin} keeps seek focus styling in sync`, async ({ page }) => {
    const name = `${variant.framework}-${variant.skin}-seek-focus.png`;

    const legacyRoot = await openVariant(page, variant, 'css', 800, 'legacy');
    const legacyContract = await seekFocusContract(page);

    await expect(legacyRoot).toHaveScreenshot(name);

    const cssRoot = await openVariant(page, variant, 'css', 800);
    const cssContract = await seekFocusContract(page);

    expect(cssContract).toEqual(legacyContract);
    await expect(cssRoot).toHaveScreenshot(name);

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);
    const tailwindContract = await seekFocusContract(page);

    expect(tailwindContract).toEqual(cssContract);
    await expect(tailwindRoot).toHaveScreenshot(name);
  });

  test(`${variant.framework} ${variant.skin} keeps seek dragging attached to the pointer`, async ({ page }) => {
    await openVariant(page, variant, 'css', 800, 'legacy');
    const legacyContract = await seekDragContract(page);

    expect(legacyContract).toMatchObject({ fillIsImmediate: true, thumbPositionIsImmediate: true });

    await openVariant(page, variant, 'css', 800);
    const cssContract = await seekDragContract(page);

    await openVariant(page, variant, 'tailwind', 800);
    const tailwindContract = await seekDragContract(page);

    expect(tailwindContract).toEqual(cssContract);
    expect(tailwindContract).toEqual({ fillIsImmediate: true, lag: 0, thumbPositionIsImmediate: true });
  });

  test(`${variant.framework} ${variant.skin} keeps hidden controls and caption placement in sync`, async ({ page }) => {
    const name = `${variant.framework}-${variant.skin}-hidden-controls.png`;

    const legacyRoot = await openVariant(page, variant, 'css', 800, 'legacy');

    await enableCaptions(page, legacyRoot);
    const legacyContract = await hideControls(legacyRoot);

    await expect(legacyRoot).toHaveScreenshot(name);

    const cssRoot = await openVariant(page, variant, 'css', 800);

    await enableCaptions(page, cssRoot);
    const cssContract = await hideControls(cssRoot);

    expect(cssContract).toEqual(legacyContract);
    await expect(cssRoot).toHaveScreenshot(name);

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);

    await enableCaptions(page, tailwindRoot);
    const tailwindContract = await hideControls(tailwindRoot);

    expect(tailwindContract).toEqual(cssContract);
    await expect(tailwindRoot).toHaveScreenshot(name);
  });

  test(`${variant.framework} ${variant.skin} keeps buffering styling in sync`, async ({ page }) => {
    const name = `${variant.framework}-${variant.skin}-buffering.png`;
    const legacyName =
      variant.skin === 'minimal-video' ? `${variant.framework}-${variant.skin}-buffering-legacy.png` : name;

    const legacyRoot = await openVariant(page, variant, 'css', 800, 'legacy');
    const legacyContract = await showBuffering(legacyRoot);

    await expect(legacyRoot).toHaveScreenshot(legacyName);

    const cssRoot = await openVariant(page, variant, 'css', 800);
    const cssContract = await showBuffering(cssRoot);

    expect(cssContract).toEqual(legacyContract);
    await expect(cssRoot).toHaveScreenshot(name);

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);
    const tailwindContract = await showBuffering(tailwindRoot);

    expect(tailwindContract).toEqual(cssContract);
    await expect(tailwindRoot).toHaveScreenshot(name);
  });

  test(`${variant.framework} ${variant.skin} keeps popup styling in sync`, async ({ page }) => {
    const legacyRoot = await openVariant(page, variant, 'css', 800, 'legacy');
    const legacyPopup = await openVolumePopover(page);
    const legacyContract = await popupSurfaceContract(legacyRoot, legacyPopup);

    const cssRoot = await openVariant(page, variant, 'css', 800);
    const cssPopup = await openVolumePopover(page);
    const cssContract = await popupSurfaceContract(cssRoot, cssPopup);

    if (variant.skin === 'minimal-video') {
      // #2386 spacing parity is tracked in packages/skins/vjsc/gaps.md.
      expect(minimalVolumeSurfaceContract(cssContract)).toEqual(minimalVolumeSurfaceContract(legacyContract));
    } else {
      expect(cssContract).toEqual(legacyContract);
    }

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);
    const tailwindPopup = await openVolumePopover(page);
    const tailwindContract = await popupSurfaceContract(tailwindRoot, tailwindPopup);

    expect(tailwindContract).toEqual(cssContract);
    await expect(tailwindRoot).toHaveScreenshot(`${variant.framework}-${variant.skin}-volume-popover.png`);
  });

  test(`${variant.framework} ${variant.skin} keeps tooltip styling in sync`, async ({ page }) => {
    const legacyRoot = await openVariant(page, variant, 'css', 800, 'legacy');
    const legacyTooltip = await openTooltip(page, 'Play');
    const legacyContract = await popupSurfaceContract(legacyRoot, legacyTooltip);

    const cssRoot = await openVariant(page, variant, 'css', 800);
    const cssTooltip = await openTooltip(page, 'Play');
    const cssContract = await popupSurfaceContract(cssRoot, cssTooltip);

    expect(cssContract).toEqual(legacyContract);

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);
    const tailwindTooltip = await openTooltip(page, 'Play');
    const tailwindContract = await popupSurfaceContract(tailwindRoot, tailwindTooltip);

    expect(tailwindContract).toEqual(cssContract);
    await expect(tailwindRoot).toHaveScreenshot(`${variant.framework}-${variant.skin}-play-tooltip.png`);
  });

  test(`${variant.framework} ${variant.skin} keeps settings menu styling in sync`, async ({ page }) => {
    const legacyRoot = await openVariant(page, variant, 'css', 800, 'legacy');
    const legacyMenu = await openSettingsMenu(page);
    const legacyContract = await popupContract(legacyRoot, legacyMenu);

    const cssRoot = await openVariant(page, variant, 'css', 800);
    const cssMenu = await openSettingsMenu(page);
    const cssContract = await popupContract(cssRoot, cssMenu);

    expect(cssContract).toEqual(legacyContract);

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);
    const tailwindMenu = await openSettingsMenu(page);
    const tailwindContract = await popupContract(tailwindRoot, tailwindMenu);

    expect(tailwindContract).toEqual(cssContract);
    await expect(tailwindRoot).toHaveScreenshot(`${variant.framework}-${variant.skin}-settings-menu.png`);
  });

  test(`${variant.framework} ${variant.skin} keeps settings submenu styling in sync`, async ({ page }) => {
    const legacyRoot = await openVariant(page, variant, 'css', 800, 'legacy');
    const legacySubmenu = await openSettingsSubmenu(page, 'Speed');
    const legacyContract = await popupContract(legacyRoot, legacySubmenu);

    const cssRoot = await openVariant(page, variant, 'css', 800);
    const cssSubmenu = await openSettingsSubmenu(page, 'Speed');
    const cssContract = await popupContract(cssRoot, cssSubmenu);

    expect(cssContract).toEqual(legacyContract);

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);
    const tailwindSubmenu = await openSettingsSubmenu(page, 'Speed');
    const tailwindContract = await popupContract(tailwindRoot, tailwindSubmenu);

    expect(tailwindContract).toEqual(cssContract);
    await expect(tailwindRoot).toHaveScreenshot(`${variant.framework}-${variant.skin}-speed-menu.png`);
  });

  test(`${variant.framework} ${variant.skin} keeps settings submenu motion coordinated`, async ({ page }) => {
    await openVariant(page, variant, 'css', 800, 'legacy');
    const legacyContract = await settingsSubmenuMotionContract(page, 'Speed');

    await openVariant(page, variant, 'css', 800);
    const cssContract = await settingsSubmenuMotionContract(page, 'Speed');

    expect(cssContract).toEqual(legacyContract);

    await openVariant(page, variant, 'tailwind', 800);
    const tailwindContract = await settingsSubmenuMotionContract(page, 'Speed');

    expect(tailwindContract).toEqual(cssContract);
    expect(tailwindContract).toMatchObject({ movingRootLayers: 1, submenuPersistsDuringClose: true });
  });

  test(`${variant.framework} ${variant.skin} keeps captions submenu styling in sync`, async ({ page }) => {
    const legacyRoot = await openVariant(page, variant, 'css', 800, 'legacy');
    const legacySubmenu = await openSettingsSubmenu(page, 'Captions');
    const legacyContract = await popupContract(legacyRoot, legacySubmenu);

    const cssRoot = await openVariant(page, variant, 'css', 800);
    const cssSubmenu = await openSettingsSubmenu(page, 'Captions');
    const cssContract = await popupContract(cssRoot, cssSubmenu);

    expect(cssContract).toEqual(legacyContract);

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);
    const tailwindSubmenu = await openSettingsSubmenu(page, 'Captions');
    const tailwindContract = await popupContract(tailwindRoot, tailwindSubmenu);

    expect(tailwindContract).toEqual(cssContract);
    await expect(tailwindRoot).toHaveScreenshot(`${variant.framework}-${variant.skin}-captions-menu.png`);
  });

  test(`${variant.framework} ${variant.skin} keeps keyboard feedback styling in sync`, async ({ page }) => {
    await page.clock.install();
    const legacyRoot = await openVariant(page, variant, 'css', 800, 'legacy');
    const legacyContract = await keyboardFeedbackContract(page, legacyRoot);

    const cssRoot = await openVariant(page, variant, 'css', 800);
    const cssContract = await keyboardFeedbackContract(page, cssRoot);

    expect(cssContract).toEqual(legacyContract);

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);
    const tailwindContract = await keyboardFeedbackContract(page, tailwindRoot);

    expect(tailwindContract).toEqual(cssContract);
  });

  test(`${variant.framework} ${variant.skin} keeps RTL settings motion in sync`, async ({ page }) => {
    const cssRoot = await openVariant(page, variant, 'css', 800);

    await setDirection(page, 'rtl');
    const cssSubmenu = await openSettingsSubmenu(page, 'Speed');
    const cssContract = await rtlMenuContract(cssRoot, cssSubmenu);

    expect(cssContract.direction).toEqual({ direction: 'rtl', parentTranslate: 100, submenuTranslate: -100 });

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);

    await setDirection(page, 'rtl');
    const tailwindSubmenu = await openSettingsSubmenu(page, 'Speed');
    const tailwindContract = await rtlMenuContract(tailwindRoot, tailwindSubmenu);

    expect(tailwindContract).toEqual(cssContract);
  });

  test(`${variant.framework} ${variant.skin} keeps active captions in sync`, async ({ page }) => {
    const name = `${variant.framework}-${variant.skin}-captions-cue.png`;

    const legacyRoot = await openVariant(page, variant, 'css', 800, 'legacy');

    await enableCaptions(page, legacyRoot);
    await expect(legacyRoot).toHaveScreenshot(name);

    const cssRoot = await openVariant(page, variant, 'css', 800);

    await enableCaptions(page, cssRoot);
    await expect(cssRoot).toHaveScreenshot(name);

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);

    await enableCaptions(page, tailwindRoot);
    await expect(tailwindRoot).toHaveScreenshot(name);
  });

  test(`${variant.framework} ${variant.skin} keeps the seek preview in sync`, async ({ page }) => {
    const name = `${variant.framework}-${variant.skin}-seek-preview.png`;
    const legacyRoot = await openVariant(page, variant, 'css', 800, 'legacy');
    const legacySlider = await openSeekPreview(page);
    const legacyContract = await sliderContract(legacySlider);

    await expect(legacyRoot).toHaveScreenshot(name);

    const cssRoot = await openVariant(page, variant, 'css', 800);
    const cssSlider = await openSeekPreview(page);
    const cssContract = await sliderContract(cssSlider);

    // The default controls allocate the timeline's flexible width at the region level,
    // so compare only the slider's intrinsic styling contract.
    expect(variant.skin === 'default-video' ? withoutSliderWidths(cssContract) : cssContract).toEqual(
      variant.skin === 'default-video' ? withoutSliderWidths(legacyContract) : legacyContract
    );
    await expect(cssRoot).toHaveScreenshot(name);

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);
    const tailwindSlider = await openSeekPreview(page);
    const tailwindContract = await sliderContract(tailwindSlider);

    expect(tailwindContract).toEqual(cssContract);
    await expect(tailwindRoot).toHaveScreenshot(name);
  });

  test(`${variant.framework} ${variant.skin} keeps error styling in sync`, async ({ page }) => {
    const name = `${variant.framework}-${variant.skin}-error.png`;
    // Both generated targets share the complete React dialog typography contract.
    const reference = { framework: 'react', skin: variant.skin } as const;
    const legacyRoot = await openVariant(page, reference, 'css', 800, 'legacy');
    const legacyDialog = await triggerMediaError(page);
    const legacyContract = await errorDialogContract(legacyRoot, legacyDialog);

    await expect(legacyRoot).toHaveScreenshot(name);

    const cssRoot = await openVariant(page, variant, 'css', 800);
    const cssDialog = await triggerMediaError(page);
    const cssContract = await errorDialogContract(cssRoot, cssDialog);

    expect(cssContract).toEqual(legacyContract);
    await expect(cssRoot).toHaveScreenshot(name);

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);
    const tailwindDialog = await triggerMediaError(page);
    const tailwindContract = await errorDialogContract(tailwindRoot, tailwindDialog);

    expect(tailwindContract).toEqual(cssContract);
    await expect(tailwindRoot).toHaveScreenshot(name);
  });

  test(`${variant.framework} ${variant.skin} keeps fullscreen scaling in sync`, async ({ page }) => {
    const name = `${variant.framework}-${variant.skin}-fullscreen.png`;

    await page.setViewportSize({ width: 1280, height: 720 });

    const legacyRoot = await openVariant(page, variant, 'css', 800, 'legacy');
    const legacyContract = await enterFullscreen(page, legacyRoot);

    await expect(legacyRoot).toHaveScreenshot(name);

    const cssRoot = await openVariant(page, variant, 'css', 800);
    const cssContract = await enterFullscreen(page, cssRoot);

    expect(cssContract).toEqual(legacyContract);
    await expect(cssRoot).toHaveScreenshot(name);

    const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);
    const tailwindContract = await enterFullscreen(page, tailwindRoot);

    expect(tailwindContract).toEqual(cssContract);
    await expect(tailwindRoot).toHaveScreenshot(name);
  });
}

for (const skin of ['default-video', 'minimal-video'] as const) {
  for (const preference of ['reduced-transparency', 'contrast-more', 'forced-colors'] as const) {
    test(`react ${skin} keeps CSS and Tailwind ${preference} surfaces in sync`, async ({ page }) => {
      if (preference === 'reduced-transparency') {
        const session = await page.context().newCDPSession(page);

        await session.send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
        });
      } else if (preference === 'contrast-more') {
        await page.emulateMedia({ contrast: 'more' });
      } else {
        await page.emulateMedia({ forcedColors: 'active' });
      }

      const variant = { framework: 'react', skin } as const;
      const name = `react-${skin}-${preference}.png`;

      const cssRoot = await openVariant(page, variant, 'css', 800);
      const cssMenu = await openSettingsMenu(page);
      const cssContract = await preferenceSurfaceContract(cssRoot, cssMenu);

      if (preference !== 'forced-colors') {
        expect(cssContract.controls.backdropFilter).toBe('none');
        expect(cssContract.menu.backdropFilter).toBe('none');
      }

      await expect(cssRoot).toHaveScreenshot(name);

      const tailwindRoot = await openVariant(page, variant, 'tailwind', 800);
      const tailwindMenu = await openSettingsMenu(page);
      const tailwindContract = await preferenceSurfaceContract(tailwindRoot, tailwindMenu);

      expect(tailwindContract).toEqual(cssContract);
      await expect(tailwindRoot).toHaveScreenshot(name);
    });
  }
}

test('semantic CSS stays easy to override from unlayered consumer styles', async ({ page }) => {
  await openVariant(page, CASES[0], 'css', 800);
  await page.addStyleTag({
    content: '.media-play-button { width: 44px; height: 44px; background: rgb(18 52 86); }',
  });

  const play = page.getByRole('button', { name: 'Play' });

  await expect(play).toHaveCSS('width', '44px');
  await expect(play).toHaveCSS('height', '44px');
  await expect(play).toHaveCSS('background-color', 'rgb(18, 52, 86)');
});

test('reduced motion keeps CSS and Tailwind transitions in sync', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const variant = CASES[0];

  await openVariant(page, variant, 'css', 800);
  const cssTooltip = await openTooltip(page, 'Play');
  const cssTooltipDuration = await cssTooltip.evaluate((element) => getComputedStyle(element).transitionDuration);
  const cssMenuRoot = await openVariant(page, variant, 'css', 800);
  const cssMenu = await openSettingsMenu(page);
  const cssContract = await reducedMotionContract(cssMenuRoot, cssMenu, cssTooltipDuration);

  await openVariant(page, variant, 'tailwind', 800);
  const tailwindTooltip = await openTooltip(page, 'Play');
  const tailwindTooltipDuration = await tailwindTooltip.evaluate(
    (element) => getComputedStyle(element).transitionDuration
  );
  const tailwindMenuRoot = await openVariant(page, variant, 'tailwind', 800);
  const tailwindMenu = await openSettingsMenu(page);
  const tailwindContract = await reducedMotionContract(tailwindMenuRoot, tailwindMenu, tailwindTooltipDuration);

  expect(tailwindContract).toEqual(cssContract);
  expect(cssContract).toMatchObject({ menu: '0s', tooltip: '0s' });
});

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

  if (source === 'vjsc') await expect(root).toHaveAttribute('data-controls-visible', '');

  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  const poster = root.locator('img[data-loaded], media-poster[data-loaded]').first();

  await expect(poster).toBeVisible();
  await expect(poster).toHaveCSS('opacity', '1');
  await expect(root.getByRole('button', { name: /captions/i }).first()).toHaveAttribute(
    'data-availability',
    'available'
  );
  await root.dispatchEvent('pointermove', { pointerType: 'mouse' });
  await root.evaluate((element, playerWidth) => {
    const tree = element.getRootNode();
    const sizingTarget = tree instanceof ShadowRoot ? tree.host : element;

    if (sizingTarget instanceof HTMLElement) sizingTarget.style.width = `${playerWidth}px`;
  }, width);

  return root;
}

async function focusPlayButton(page: Page): Promise<Locator> {
  const button = page.getByRole('button', { name: 'Play', exact: true });

  await button.focus();
  await expect(button).toBeFocused();
  await page.waitForTimeout(200);
  return button;
}

async function focusContract(target: Locator) {
  await target.focus();
  await expect(target).toBeFocused();
  await target.page().waitForTimeout(200);
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    const context = new OffscreenCanvas(1, 1).getContext('2d');
    if (!context) throw new Error('Expected a 2D canvas context.');

    context.fillStyle = style.outlineColor;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;

    return {
      outlineColor: [red, green, blue, alpha],
      outlineOffset: style.outlineOffset,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
}

async function buttonStateContract(button: Locator) {
  return button.evaluate((element) => {
    const style = getComputedStyle(element);
    const context = new OffscreenCanvas(1, 1).getContext('2d');
    if (!context) throw new Error('Expected a 2D canvas context.');

    context.fillStyle = style.outlineColor;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;

    return {
      background: style.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : 'painted',
      cursor: style.cursor,
      opacity: style.opacity,
      outlineColor: [red, green, blue, alpha],
      outlineOffset: style.outlineOffset,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      scale: style.scale,
    };
  });
}

async function disabledButtonContract(button: Locator) {
  await button.evaluate((element) => {
    if (element instanceof HTMLElement) element.blur();

    element.setAttribute('aria-disabled', 'true');
  });
  await button.page().waitForTimeout(200);
  const contract = await buttonStateContract(button);

  await button.evaluate((element) => element.removeAttribute('aria-disabled'));
  return contract;
}

async function pressedButtonContract(page: Page, button: Locator) {
  await button.hover();
  await page.mouse.down();
  await page.waitForTimeout(200);
  const contract = await buttonStateContract(button);

  await page.mouse.up();
  return contract;
}

async function seekFocusContract(page: Page) {
  const thumb = page.getByRole('slider', { name: 'Seek' });

  await thumb.focus();
  await expect(thumb).toBeFocused();
  await page.waitForTimeout(200);

  return thumb.evaluate((element) => {
    const style = getComputedStyle(element);
    const after = getComputedStyle(element, '::after');
    const rect = element.getBoundingClientRect();

    return {
      opacity: style.opacity,
      outlineOffset: style.outlineOffset,
      outlineWidth: style.outlineWidth,
      scale: style.scale,
      rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
      ring: {
        content: after.content === 'none' ? 'none' : 'painted',
        opacity: after.opacity,
        scale: after.scale === 'none' || after.scale === '1' ? 'full' : after.scale,
        shadow: after.boxShadow === 'none' ? 'none' : 'painted',
      },
    };
  });
}

async function seekDragContract(page: Page) {
  const thumb = page.getByRole('slider', { name: 'Seek' });
  const slider = thumb.locator(
    'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " media-slider ") or contains(concat(" ", normalize-space(@class), " "), " media-time-slider ") or contains(@class, "group/slider")][1]'
  );
  const box = await slider.boundingBox();
  if (!box) throw new Error('Expected the seek slider to have a rendered box.');

  const pointerX = box.x + box.width * 0.73;
  const pointerY = box.y + box.height / 2;

  await page.mouse.move(box.x + box.width * 0.25, pointerY);
  await page.mouse.down();
  await page.mouse.move(pointerX, pointerY);
  await expect(slider).toHaveAttribute('data-dragging', '');

  const contract = await thumb.evaluate((element, expectedX) => {
    const style = getComputedStyle(element);
    const slider = [...(element.parentElement?.closest('[data-orientation]')?.querySelectorAll('*') ?? [])];
    const fills = slider
      .map((target) => getComputedStyle(target))
      .filter((style) =>
        style.transitionProperty
          .split(',')
          .map((value) => value.trim())
          .includes('clip-path')
      );
    const rect = element.getBoundingClientRect();
    const lag = Math.abs(rect.x + rect.width / 2 - expectedX);
    const positionProperties = new Set(style.transitionProperty.split(',').map((value) => value.trim()));
    const fillDurations = fills.flatMap((style) =>
      style.transitionDuration.split(',').map((value) => Number.parseFloat(value))
    );

    return {
      fillIsImmediate: fillDurations.length > 0 && fillDurations.every((duration) => duration === 0),
      lag: lag <= 1 ? 0 : Math.ceil(lag),
      thumbPositionIsImmediate: !positionProperties.has('left') && !positionProperties.has('top'),
    };
  }, pointerX);

  await page.mouse.up();
  return contract;
}

async function hideControls(root: Locator) {
  const controls = root.locator(CONTROLS_SELECTOR).first();

  await expect(controls).toHaveAttribute('data-visible', '');
  await controls.evaluate((element) => {
    element.removeAttribute('data-visible');

    if (element.previousElementSibling?.getAttribute('aria-hidden') === 'true') {
      element.previousElementSibling.removeAttribute('data-visible');
    }

    element.querySelector(':scope > [aria-hidden="true"]')?.removeAttribute('data-visible');
    element.closest('[role="group"]')?.removeAttribute('data-controls-visible');
  });
  await root.page().waitForTimeout(650);

  return root.evaluate((element, controlsSelector) => {
    const inspect = (target: Element | null) => {
      if (!(target instanceof HTMLElement)) return null;

      const style = getComputedStyle(target);

      return {
        display: style.display,
        filter: style.filter === 'none' ? 'none' : 'blurred',
        opacity: style.opacity,
        pointerEvents: style.pointerEvents,
        scale: style.scale,
        translate: style.translate,
      };
    };

    const controls = element.querySelector<HTMLElement>(controlsSelector);
    const backdrop = inspect(
      element.querySelector('.media-controls__backdrop') ??
        controls?.querySelector(':scope > [aria-hidden="true"]') ??
        controls?.previousElementSibling ??
        null
    );

    return {
      cursor: getComputedStyle(element).cursor,
      controls: inspect(controls),
      backdrop: backdrop
        ? {
            filter: backdrop.filter,
            opacity: backdrop.opacity,
            pointerEvents: backdrop.pointerEvents,
            scale: backdrop.scale,
          }
        : null,
    };
  }, CONTROLS_SELECTOR);
}

async function showBuffering(root: Locator) {
  const indicator = root.locator(BUFFERING_INDICATOR_SELECTOR).first();

  await indicator.evaluate((element) => element.setAttribute('data-visible', ''));
  await root.page().waitForTimeout(500);

  return root.evaluate((element, bufferingIndicatorSelector) => {
    const indicator = element.querySelector<HTMLElement>(bufferingIndicatorSelector);
    const backdrop = element.querySelector<HTMLElement>('[class~="peer-data-visible/buffering:bg-black/35"]');
    const spinner = indicator?.querySelector<HTMLElement>('media-icon, svg');
    const inspect = (target: HTMLElement | null | undefined) => {
      if (!target) return null;

      const style = getComputedStyle(target);
      const rect = target.getBoundingClientRect();

      return {
        display: style.display,
        position: style.position,
        pointerEvents: style.pointerEvents,
        opacity: style.opacity,
        rect: { width: Math.round(rect.width), height: Math.round(rect.height) },
      };
    };

    const backdropStyle = backdrop
      ? getComputedStyle(backdrop)
      : indicator
        ? getComputedStyle(indicator, '::before')
        : null;
    const backdropRect = backdrop ?? indicator;
    const spinnerStyle = spinner ? getComputedStyle(spinner) : null;

    return {
      indicator: inspect(indicator),
      backdrop: {
        backdropFilter: backdropStyle?.backdropFilter.includes('blur(8px)') ? 'blurred' : backdropStyle?.backdropFilter,
        background: backdropStyle?.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : 'painted',
        backgroundImage: backdropStyle?.backgroundImage === 'none' ? 'none' : 'painted',
        opacity: backdropStyle?.opacity,
        rect: backdropRect
          ? {
              width: Math.round(backdropRect.getBoundingClientRect().width),
              height: Math.round(backdropRect.getBoundingClientRect().height),
            }
          : null,
      },
      spinner: {
        opacity: spinnerStyle?.opacity,
        rect: spinner
          ? {
              width: Math.round(spinner.getBoundingClientRect().width),
              height: Math.round(spinner.getBoundingClientRect().height),
            }
          : null,
      },
    };
  }, BUFFERING_INDICATOR_SELECTOR);
}

async function enterFullscreen(page: Page, root: Locator) {
  const button = root.getByRole('button', { name: /full ?screen/i }).first();

  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveAttribute('data-fullscreen', '');
  await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  await page.waitForTimeout(300);

  return root.evaluate((element) => {
    const inspect = (target: Element | null) => {
      if (!(target instanceof HTMLElement || target instanceof SVGElement)) return null;

      const style = getComputedStyle(target);
      const rect = target.getBoundingClientRect();

      return {
        fontSize: style.fontSize,
        height: Math.round(rect.height),
        width: Math.round(rect.width),
      };
    };
    const play = element.querySelector<HTMLElement>('[role="button"][aria-label="Play"]');
    const icon = [...(play?.querySelectorAll<HTMLElement | SVGElement>('svg, media-icon') ?? [])].find((candidate) => {
      const rect = candidate.getBoundingClientRect();

      return rect.width > 0 && rect.height > 0;
    });
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return {
      root: {
        borderRadius: style.borderRadius,
        fontSize: style.fontSize,
        height: Math.round(rect.height),
        width: Math.round(rect.width),
      },
      play: inspect(play),
      icon: inspect(icon),
    };
  });
}

async function preferenceSurfaceContract(root: Locator, menu: Locator) {
  const controls = root.locator(CONTROLS_SELECTOR).first();

  const inspect = (target: Locator) =>
    target.evaluate((element) => {
      const style = getComputedStyle(element);
      const after = getComputedStyle(element, '::after');

      return {
        backdropFilter: style.backdropFilter === 'none' ? 'none' : 'filtered',
        background: style.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : 'painted',
        borderColor: style.borderBottomColor,
        borderWidth: style.borderBottomWidth,
        boxShadow: style.boxShadow === 'none' ? 'none' : 'painted',
        frame: after.boxShadow === 'none' ? 'none' : 'painted',
      };
    });

  return {
    controls: await inspect(controls),
    menu: await inspect(menu),
  };
}

async function keyboardFeedbackContract(page: Page, root: Locator) {
  return {
    volume: await triggerIndicator(page, root, 'ArrowUp', '[data-level]:not([role])'),
    captions: await triggerIndicator(page, root, 'c', '[data-status="captions-on"], [data-status="captions-off"]'),
    seek: await triggerIndicator(page, root, 'ArrowRight', '[data-direction="forward"]'),
    playback: await triggerIndicator(page, root, 'k', '[data-status="play"], [data-status="pause"]'),
  };
}

async function triggerIndicator(page: Page, root: Locator, key: string, selector: string) {
  await root.focus();
  await page.keyboard.press(key);
  await page.clock.runFor(150);
  const indicator = page.locator(selector).filter({ visible: true }).first();

  await expect(indicator).toBeVisible();
  await expect(indicator).not.toHaveAttribute('data-starting-style', '');
  const contract = await indicatorContract(indicator);

  await page.clock.runFor(1_000);
  await expect(indicator).toBeHidden();
  return contract;
}

async function indicatorContract(indicator: Locator) {
  return indicator.evaluate((element) => {
    const round = (value: number) => Math.round(value);
    const inspect = (target: Element | null) => {
      if (!(target instanceof HTMLElement || target instanceof SVGElement)) return null;

      const style = getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      const radius = Number.parseFloat(style.borderRadius);
      const width = target instanceof HTMLElement ? target.offsetWidth : Number.parseFloat(style.width);
      const height = target instanceof HTMLElement ? target.offsetHeight : Number.parseFloat(style.height);

      return {
        padding: style.padding,
        gap: style.gap,
        borderRadius: radius >= Math.min(rect.width, rect.height) / 2 ? 'round' : style.borderRadius,
        backgroundColor: style.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : 'painted',
        backgroundImage: style.backgroundImage === 'none' ? 'none' : 'painted',
        backdropFilter: style.backdropFilter,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        inset: { top: style.top, right: style.right, bottom: style.bottom, left: style.left },
        rect: {
          width: round(width),
          height: round(height),
        },
      };
    };
    const inspectProgress = (content: Element | null, progress: Element | undefined) => {
      if (!content) return null;

      const target = progress ?? content;
      const trackStyle = getComputedStyle(target, progress ? null : '::before');
      if (!progress && (trackStyle.content === 'none' || trackStyle.display === 'none')) return null;

      const fillStyle = getComputedStyle(target, progress ? '::before' : '::after');
      const dimensions = (style: CSSStyleDeclaration, measuredTarget?: Element) => {
        const rect = measuredTarget?.getBoundingClientRect();

        return {
          width: round(rect?.width ?? Number.parseFloat(style.width)),
          height: round(rect?.height ?? Number.parseFloat(style.height)),
        };
      };
      const trackRect = dimensions(trackStyle, progress);
      const fillRect = dimensions(fillStyle);
      const radius = Number.parseFloat(trackStyle.borderRadius);

      return {
        track: {
          background: trackStyle.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : 'painted',
          borderRadius: radius >= Math.min(trackRect.width, trackRect.height) / 2 ? 'round' : trackStyle.borderRadius,
          boxShadow: trackStyle.boxShadow === 'none' ? 'none' : 'painted',
          rect: trackRect,
        },
        fill: {
          background: fillStyle.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : 'painted',
          rect: fillRect,
          transitionDuration: fillStyle.transitionDuration,
          transitionProperty: fillStyle.transitionProperty,
        },
      };
    };
    const visibleIcon = [...element.querySelectorAll('svg')].find((icon) => {
      const style = getComputedStyle(icon);

      return style.display !== 'none';
    });
    const isTopIndicator =
      element.hasAttribute('data-level') || element.getAttribute('data-status')?.startsWith('captions');
    const content = isTopIndicator ? element.firstElementChild : null;
    const progress = [...(content?.children ?? [])].find((child) => {
      const style = getComputedStyle(child);

      return child.tagName === 'DIV' && style.display !== 'none';
    });
    const value = isTopIndicator
      ? content?.lastElementChild
      : element.hasAttribute('data-direction')
        ? element.lastElementChild
        : null;

    return {
      level: element.getAttribute('data-level'),
      status: element.getAttribute('data-status'),
      direction: element.getAttribute('data-direction'),
      root: inspect(element),
      content: inspect(content),
      progress: inspectProgress(content, progress),
      icon: inspect(visibleIcon ?? null),
      value: inspect(value ?? null),
    };
  });
}

async function setDirection(page: Page, direction: 'ltr' | 'rtl') {
  await page.locator('html').evaluate((element, value) => {
    element.dir = value;
  }, direction);
}

async function enableCaptions(page: Page, root: Locator) {
  const button = root.getByRole('button', { name: /captions/i }).first();

  await button.click();
  await expect(button).toHaveAttribute('data-active', '');
  // The HTML player owns its media outside the skin's accessible group,
  // while the React skin renders it within the group.
  const video = page.locator('video').first();

  await video.evaluate((element) => {
    element.pause();
    element.currentTime = 2;
  });
  await expect
    .poll(() => video.evaluate((element) => element.textTracks[0]?.activeCues?.length ?? 0))
    .toBeGreaterThan(0);
  await page.waitForTimeout(100);
}

async function openSeekPreview(page: Page) {
  const thumb = page.getByRole('slider', { name: 'Seek' });
  const slider = thumb.locator('..');
  const box = await slider.boundingBox();
  if (!box) throw new Error('Expected the seek slider to have a rendered box.');

  await slider.hover({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(slider).toHaveAttribute('data-pointing', '');
  await page.waitForTimeout(200);
  return slider;
}

async function sliderContract(slider: Locator) {
  return slider.evaluate((element) => {
    const inspect = (target: Element | null) => {
      if (!(target instanceof HTMLElement)) return null;

      const style = getComputedStyle(target);

      return {
        display: style.display,
        position: style.position,
        width: Math.round(target.offsetWidth),
        height: Math.round(target.offsetHeight),
        padding: style.padding,
        opacity: style.opacity,
      };
    };

    const chapters = element.firstElementChild;
    const chapter = chapters?.firstElementChild;
    const track = chapter?.firstElementChild;
    const thumb = element.querySelector('[role="slider"]');
    const preview = element.lastElementChild;
    const thumbnail = preview?.firstElementChild;
    const previewValue = preview?.lastElementChild;

    return {
      root: inspect(element),
      track: inspect(track ?? null),
      thumb: inspect(thumb),
      preview: inspect(preview),
      thumbnail: inspect(thumbnail ?? null),
      previewValue: inspect(previewValue ?? null),
    };
  });
}

function withoutSliderWidths(contract: Awaited<ReturnType<typeof sliderContract>>) {
  return {
    ...contract,
    root: contract.root ? { ...contract.root, width: undefined } : null,
    track: contract.track ? { ...contract.track, width: undefined } : null,
  };
}

async function triggerMediaError(page: Page): Promise<Locator> {
  await page
    .locator('video')
    .first()
    .evaluate((element) => {
      element.src = '/missing-video-that-does-not-exist.mp4';
      element.load();
    });
  const dialog = page.getByRole('alertdialog');

  await expect
    .poll(() =>
      dialog.evaluate((element) => {
        const target = element.querySelector('media-error-dialog') ?? element;
        const rect = target.getBoundingClientRect();
        const style = getComputedStyle(target);

        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      })
    )
    .toBe(true);
  await expect(dialog).not.toHaveAttribute('data-starting-style', '');
  await page.waitForTimeout(600);
  return dialog;
}

async function errorDialogContract(root: Locator, dialog: Locator) {
  const rootRect = await root.boundingBox();
  if (!rootRect) throw new Error('Expected the media player to have a rendered box.');

  return dialog.evaluate((element, playerRect) => {
    const surface = element.querySelector<HTMLElement>('.media-dialog__popup, .media-dialog-popup') ?? element;
    const title = element.querySelector<HTMLElement>('h2, media-dialog-title');
    const description = element.querySelector<HTMLElement>('p, media-dialog-description');
    const close = element.querySelector<HTMLElement>('button, media-dialog-close');
    const round = (value: number) => Math.round(value * 10) / 10;
    const inspect = (target: HTMLElement | null, includePadding = true) => {
      if (!target) return null;

      const style = getComputedStyle(target);
      const rect = target.getBoundingClientRect();

      return {
        ...(includePadding ? { padding: style.padding } : {}),
        gap: style.gap,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        opacity: style.opacity,
        rect: {
          x: round(rect.x - playerRect.x),
          y: round(rect.y - playerRect.y),
          width: round(rect.width),
          height: round(rect.height),
        },
      };
    };

    return {
      surface: inspect(surface),
      title: inspect(title),
      description: inspect(description),
      close: inspect(close, false),
    };
  }, rootRect);
}

async function reducedMotionContract(root: Locator, menu: Locator, tooltipDuration: string) {
  const rootDurations = await root.evaluate((element, controlsSelector) => {
    const controls = element.querySelector<HTMLElement>(controlsSelector);

    return {
      container: getComputedStyle(element).transitionDuration,
      controls: controls ? getComputedStyle(controls).transitionDuration : null,
    };
  }, CONTROLS_SELECTOR);
  const menuDuration = await menu.evaluate((element) => getComputedStyle(element).transitionDuration);

  return { ...rootDurations, menu: menuDuration, tooltip: tooltipDuration };
}

async function rtlMenuContract(root: Locator, submenu: Locator) {
  const popup = await popupContract(root, submenu);
  const direction = await submenu.evaluate((element) => {
    const style = getComputedStyle(element);
    const parentContent = [...(element.parentElement?.children ?? [])].find(
      (child) => child.getAttribute('role') === 'menu' && !child.hasAttribute('data-submenu')
    );

    return {
      direction: style.direction,
      parentTranslate: parentContent ? Number.parseFloat(getComputedStyle(parentContent).translate) : Number.NaN,
      submenuTranslate: Number.parseFloat(style.getPropertyValue('--media-submenu-translate')),
    };
  });

  return { popup, direction };
}

async function layoutContract(root: Locator) {
  return root.evaluate((element, controlsSelector) => {
    const rootRect = element.getBoundingClientRect();
    const round = (value: number) => Math.round(value * 10) / 10;
    const inspect = (
      selector: string,
      { includeGap = true, includeHorizontalPosition = true, includeRadius = true, includeWidth = true } = {}
    ) => {
      const target = selector === ':scope' ? element : element.querySelector<HTMLElement>(selector);
      if (!target) return null;

      const style = getComputedStyle(target);
      const rect = target.getBoundingClientRect();

      if (style.display === 'contents') return { display: style.display };

      const radius = Number.parseFloat(style.borderRadius);
      const isRound = radius >= Math.min(rect.width, rect.height) / 2;

      return {
        display: style.display,
        position: style.position,
        flex: style.flex,
        order: style.order,
        padding: style.padding,
        ...(includeGap ? { gap: style.gap } : {}),
        ...(includeRadius ? { borderRadius: isRound ? 'round' : style.borderRadius } : {}),
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        rect: {
          ...(includeHorizontalPosition ? { x: round(rect.x - rootRect.x) } : {}),
          y: round(rect.y - rootRect.y),
          ...(includeWidth ? { width: round(rect.width) } : {}),
          height: round(rect.height),
        },
      };
    };

    return {
      root: inspect(':scope'),
      poster: inspect('img[data-loaded], media-poster[data-loaded]', { includeRadius: false }),
      controls: inspect(controlsSelector, { includeGap: false }),
      primary: inspect('.media-controls--primary, .media-controls-primary', { includeGap: false }),
      secondary: inspect('.media-controls--secondary, .media-controls-secondary', { includeGap: false }),
      timeline: inspect('.media-time-controls, .media-time-slider-group', {
        includeHorizontalPosition: false,
        includeWidth: false,
      }),
      play: inspect('[role="button"][aria-label="Play"]'),
      mute: inspect('[role="button"][aria-label="Mute"]'),
      seekThumb: inspect('[role="slider"][aria-label="Seek"]', { includeHorizontalPosition: false }),
      settings: inspect('.media-button--settings, .media-settings-menu-trigger', {
        includeHorizontalPosition: false,
      }),
      pictureInPicture: inspect('.media-button--pip, .media-pip-button'),
      fullscreen: inspect('.media-button--fullscreen, .media-fullscreen-button'),
    };
  }, CONTROLS_SELECTOR);
}

async function openSettingsMenu(page: Page): Promise<Locator> {
  const trigger = page.getByRole('button', { name: 'Settings', exact: true });

  await expect(trigger).toBeVisible();
  await trigger.click();

  const menu = page
    .locator(
      '.media-menu--settings:visible, .media-settings:visible, [popover]:has(> [role="menu"]):visible, media-menu:has(> media-menu-content):visible, [role="menu"]:visible'
    )
    .first();

  await expect(menu).toBeVisible();
  await expect(menu).not.toHaveAttribute('data-starting-style', '');
  await page.waitForTimeout(300);
  return menu;
}

async function openSettingsSubmenu(page: Page, name: string): Promise<Locator> {
  const root = await openSettingsMenu(page);
  const trigger = root.getByRole('menuitem').filter({ hasText: name }).first();

  await expect(trigger).toBeVisible();
  await trigger.click();

  const submenu = root.locator('[data-submenu]:visible').first();

  await expect(submenu).toBeVisible();
  await expect(submenu).not.toHaveAttribute('data-starting-style', '');
  await expect(await rootMenuContent(root)).toHaveAttribute('data-child-open', '');
  await page.waitForTimeout(300);
  return submenu;
}

async function settingsSubmenuMotionContract(page: Page, name: string) {
  const root = await openSettingsMenu(page);
  const trigger = root.getByRole('menuitem').filter({ hasText: name }).first();

  await expect(trigger).toBeVisible();
  await trigger.click();

  const submenu = root.locator('[data-submenu]:visible').first();

  await expect(submenu).toBeVisible();
  await expect(await rootMenuContent(root)).toHaveAttribute('data-child-open', '');

  const motion = await root.evaluate((element) => {
    const transitionDuration = (target: Element) =>
      Math.max(
        ...getComputedStyle(target)
          .transitionDuration.split(',')
          .map((value) => Number.parseFloat(value))
      );
    const hasPanelMotion = (target: Element) => {
      const properties = new Set(
        getComputedStyle(target)
          .transitionProperty.split(',')
          .map((value) => value.trim())
      );

      return properties.has('translate') && properties.has('filter') && transitionDuration(target) === 0.25;
    };
    const movingRootLayers = [...element.children].filter(
      (child) => !child.hasAttribute('data-submenu') && hasPanelMotion(child)
    );
    const activeSubmenu = element.querySelector('[data-submenu]:not([hidden])');

    return {
      movingRootLayers: movingRootLayers.length,
      rootLayerMotion: movingRootLayers.every(hasPanelMotion),
      submenuMotion: activeSubmenu ? hasPanelMotion(activeSubmenu) : false,
    };
  });

  const back = submenu.getByRole('menuitem').filter({ hasText: name }).first();

  await back.click();
  await expect(submenu).toHaveAttribute('data-ending-style', '');
  const submenuPersistsDuringClose = await submenu.isVisible();

  await expect(submenu).toBeHidden();

  return { ...motion, submenuPersistsDuringClose };
}

async function rootMenuContent(root: Locator): Promise<Locator> {
  const content = root
    .locator(':scope > [role="menu"]:not([data-submenu]), :scope > media-menu-content:not([data-submenu])')
    .first();

  return (await content.count()) > 0 ? content : root;
}

async function openVolumePopover(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Mute' }).hover();
  const slider = page.getByRole('slider', { name: 'Volume' });

  await expect(slider).toBeVisible();
  const popup = page.locator('[popover]:visible').filter({ has: slider }).first();

  await expect(popup).toBeVisible();
  await expect(popup).not.toHaveAttribute('data-starting-style', '');
  return popup;
}

async function openTooltip(page: Page, name: string): Promise<Locator> {
  await page.getByRole('button', { name, exact: true }).hover();
  const tooltip = page.locator('[popover]:visible').filter({ hasText: name }).first();

  await expect(tooltip).toBeVisible();
  await expect(tooltip).not.toHaveAttribute('data-starting-style', '');
  return tooltip;
}

async function popupSurfaceContract(root: Locator, popup: Locator) {
  const rootRect = await root.boundingBox();
  if (!rootRect) throw new Error('Expected the media player to have a rendered box.');

  return popup.evaluate((element, playerRect) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const round = (value: number) => Math.round(value * 10) / 10;
    const radius = Number.parseFloat(style.borderRadius);
    const normalizedRadius = radius >= Math.min(rect.width, rect.height) / 2 ? 'round' : style.borderRadius;

    return {
      side: element.getAttribute('data-side'),
      align: element.getAttribute('data-align'),
      padding: style.padding,
      borderRadius: normalizedRadius,
      backdropFilter: style.backdropFilter,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      rect: {
        x: round(rect.x - playerRect.x),
        y: round(rect.y - playerRect.y),
        width: round(rect.width),
        height: round(rect.height),
      },
    };
  }, rootRect);
}

function minimalVolumeSurfaceContract(contract: Awaited<ReturnType<typeof popupSurfaceContract>>) {
  return {
    align: contract.align,
    backdropFilter: contract.backdropFilter,
    borderRadius: contract.borderRadius,
    fontSize: contract.fontSize,
    lineHeight: contract.lineHeight,
    rect: {
      height: contract.rect.height,
      y: contract.rect.y,
    },
    side: contract.side,
  };
}

async function popupContract(root: Locator, popup: Locator) {
  const rootRect = await root.boundingBox();
  if (!rootRect) throw new Error('Expected the media player to have a rendered box.');

  return popup.evaluate((element, playerRect) => {
    const round = (value: number) => Math.round(value * 10) / 10;
    const inspect = (target: Element | null) => {
      if (!(target instanceof HTMLElement)) return null;

      const style = getComputedStyle(target);
      const rect = target.getBoundingClientRect();

      return {
        display: style.display,
        padding: style.padding,
        gap: style.gap,
        borderRadius: style.borderRadius,
        overflow: style.overflow,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        rect: {
          x: round(rect.x - playerRect.x),
          y: round(rect.y - playerRect.y),
          width: round(rect.width),
          height: round(rect.height),
        },
      };
    };
    const visible = (selector: string) =>
      [...element.querySelectorAll(selector)].find((target) => target.getBoundingClientRect().width > 0) ?? null;

    return {
      side: element.getAttribute('data-side'),
      align: element.getAttribute('data-align'),
      popup: inspect(element),
      item: inspect(visible('[role^="menuitem"]')),
      separator: inspect(visible('[role="separator"], .media-menu__separator, .media-separator')),
    };
  }, rootRect);
}

async function skinContract(root: Locator) {
  return root.evaluate((element) => {
    const rootRect = element.getBoundingClientRect();
    const round = (value: number) => Math.round(value * 10) / 10;
    const relativeRect = (rect: DOMRect) => ({
      x: round(rect.x - rootRect.x),
      y: round(rect.y - rootRect.y),
      width: round(rect.width),
      height: round(rect.height),
    });
    const play = element.querySelector<HTMLElement>('[role="button"][aria-label="Play"]');
    const mute = element.querySelector<HTMLElement>('[role="button"][aria-label="Mute"]');
    const seek = element.querySelector<HTMLElement>('[role="slider"][aria-label="Seek"]');
    const controls = play?.closest<HTMLElement>('[data-interactive], media-controls');
    const poster = element.querySelector<HTMLElement>('img[data-visible], .media-poster, media-poster');

    const inspect = (target: HTMLElement | null | undefined) => {
      if (!target) return null;

      const style = getComputedStyle(target);
      const rect = target.getBoundingClientRect();
      const renderedRect = style.display === 'contents' ? null : relativeRect(rect);

      return {
        display: style.display,
        position: style.position,
        width: style.width,
        height: style.height,
        padding: style.padding,
        gap: style.gap,
        color: style.color,
        opacity: style.opacity,
        transform: style.transform,
        borderRadius: style.borderRadius,
        boxSizing: style.boxSizing,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        rect: renderedRect,
      };
    };

    const rootStyle = getComputedStyle(element);

    return {
      root: inspect(element),
      poster: inspect(poster),
      controls: inspect(controls),
      play: inspect(play),
      mute: inspect(mute),
      seek: inspect(seek),
      tokens: {
        spacing: rootStyle.getPropertyValue('--media-spacing').trim(),
        radius: rootStyle.getPropertyValue('--media-video-border-radius').trim(),
        controlRadius: rootStyle.getPropertyValue('--media-control-radius').trim(),
      },
    };
  });
}

function snapshotName(variant: (typeof CASES)[number], width: number): string {
  return `${variant.framework}-${variant.skin}-${width}.png`;
}
