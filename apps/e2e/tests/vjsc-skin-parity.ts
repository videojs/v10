import type { Locator, Page } from '@playwright/test';

export const VJSC_CONFIGURATIONS = [
  { source: 'legacy', style: 'css' },
  { source: 'vjsc', style: 'css' },
  { source: 'vjsc', style: 'tailwind' },
] as const;

export type VjscSource = (typeof VJSC_CONFIGURATIONS)[number]['source'];
export type VjscStyle = (typeof VJSC_CONFIGURATIONS)[number]['style'];

/** Reads focus, pressed, and disabled paint for one shared button host. */
export async function buttonInteractionContract(page: Page, button: Locator) {
  const inspect = () =>
    button.evaluate((element) => {
      const style = getComputedStyle(element);
      const context = new OffscreenCanvas(1, 1).getContext('2d');
      if (!context) throw new Error('Expected a 2D canvas context.');

      context.fillStyle = style.outlineColor;
      context.fillRect(0, 0, 1, 1);

      return {
        background: style.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : 'painted',
        cursor: style.cursor,
        focusVisible: element.matches(':focus-visible'),
        opacity: style.opacity,
        outlineColor: [...context.getImageData(0, 0, 1, 1).data],
        outlineOffset: style.outlineOffset,
        scale: style.scale,
      };
    });

  await button.focus();
  await page.waitForTimeout(200);
  const focus = await inspect();

  await button.evaluate((element) => {
    if (element instanceof HTMLElement) element.blur();

    element.setAttribute('aria-disabled', 'true');
  });
  await page.waitForTimeout(200);
  const disabled = await inspect();

  await button.evaluate((element) => element.removeAttribute('aria-disabled'));
  await button.hover();
  await page.mouse.down();
  await page.waitForTimeout(200);
  const pressed = await inspect();

  await page.mouse.up();
  return { disabled, focus, pressed };
}

/** Collects uncaught errors across every navigation performed by one parity case. */
export function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

/** Reads the visible and hidden paint contract for a Controls content host. */
export async function controlsVisibilityContract(controls: Locator) {
  return controls.evaluate((element) => {
    const inspect = () => {
      const style = getComputedStyle(element);

      return {
        filter: style.filter,
        opacity: style.opacity,
        pointerEvents: style.pointerEvents,
        scale: style.scale,
        translate: style.translate,
      };
    };
    const visible = inspect();
    const hadVisible = element.hasAttribute('data-visible');

    element.removeAttribute('data-visible');
    const hidden = inspect();

    element.toggleAttribute('data-visible', hadVisible);

    return { hidden, visible };
  });
}

/** Triggers keyboard feedback and verifies its rendered-presence lifecycle. */
export async function feedbackContract(page: Page, root: Locator, key: string, selector: string) {
  await root.focus();
  await page.keyboard.press(key);
  await page.clock.runFor(150);

  const indicator = page.locator(selector).filter({ visible: true }).first();

  await indicator.waitFor({ state: 'visible' });

  const contract = await indicator.evaluate((element) => {
    const style = getComputedStyle(element);

    return {
      direction: element.getAttribute('data-direction'),
      level: element.hasAttribute('data-level'),
      motion: style.transitionProperty
        .split(',')
        .map((property) => property.trim())
        .filter((property) => ['filter', 'opacity', 'scale', 'translate'].includes(property))
        .sort(),
      status: element.getAttribute('data-status'),
    };
  });

  await page.clock.runFor(1_000);
  await indicator.waitFor({ state: 'hidden' });
  return contract;
}

/** Reads the shared surface, placement, and presence-motion contract for a popup. */
export async function popupContract(popup: Locator) {
  return popup.evaluate((element) => {
    if (!(element instanceof HTMLElement)) throw new Error('Expected a popup element.');

    const hadStarting = element.hasAttribute('data-starting-style');
    const hadEnding = element.hasAttribute('data-ending-style');
    const inlineTransition = element.style.getPropertyValue('transition');
    const inlineTransitionPriority = element.style.getPropertyPriority('transition');
    const renderedStyle = getComputedStyle(element);
    const durations = renderedStyle.transitionDuration.split(',').map((value) => value.trim());
    const properties = renderedStyle.transitionProperty.split(',').map((value) => value.trim());
    const motion = properties.flatMap((property, index) =>
      ['opacity', 'filter', 'transform', 'scale'].includes(property)
        ? [{ duration: durations[index % durations.length] ?? '0s', property }]
        : []
    );

    element.style.setProperty('transition', 'none', 'important');

    for (const animation of element.getAnimations()) animation.cancel();

    element.removeAttribute('data-starting-style');
    element.removeAttribute('data-ending-style');

    const inspectPresence = (attribute: 'data-starting-style' | 'data-ending-style') => {
      element.removeAttribute('data-starting-style');
      element.removeAttribute('data-ending-style');
      element.toggleAttribute(attribute, true);

      const style = getComputedStyle(element);
      const state = {
        filter: style.filter,
        opacity: style.opacity,
        scale: style.scale === '1' ? 'none' : style.scale,
        transform: style.transform,
      };

      element.removeAttribute(attribute);
      element.toggleAttribute('data-starting-style', hadStarting);
      element.toggleAttribute('data-ending-style', hadEnding);
      return state;
    };
    const style = getComputedStyle(element);
    const safeArea = getComputedStyle(element, '::before');
    const rect = element.getBoundingClientRect();
    const paintedShadow = style.boxShadow
      .split(/,(?![^()]*(?:\)|$))/)
      .some((shadow) => !/rgba?\([^)]*(?:\/|,)\s*0(?:\.0+)?\)/.test(shadow) && /-?[1-9]\d*(?:\.\d+)?px/.test(shadow));
    const contract = {
      align: element.getAttribute('data-align'),
      backdropFilter: style.backdropFilter === 'none' ? 'none' : 'painted',
      background: style.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : 'painted',
      borderRadius: Number.parseFloat(style.borderRadius) > 50 ? 'pill' : style.borderRadius,
      motion,
      presence: {
        ending: inspectPresence('data-ending-style'),
        starting: inspectPresence('data-starting-style'),
      },
      rect: {
        boxSizing: style.boxSizing,
        height: Math.round(rect.height / 8) * 8,
        maxWidth: style.maxWidth,
        padding: style.padding,
        width: Math.round(rect.width / 8) * 8,
      },
      safeArea: {
        height: Number.parseFloat(safeArea.height) > 0 ? 'present' : 'none',
        pointerEvents: safeArea.pointerEvents,
        width: Number.parseFloat(safeArea.width) > 0 ? 'present' : 'none',
      },
      shadow: paintedShadow ? 'painted' : 'none',
      side: element.getAttribute('data-side'),
    };

    element.toggleAttribute('data-starting-style', hadStarting);
    element.toggleAttribute('data-ending-style', hadEnding);

    if (inlineTransition) {
      element.style.setProperty('transition', inlineTransition, inlineTransitionPriority);
    } else {
      element.style.removeProperty('transition');
    }

    return contract;
  });
}

/** Finds the positioned popup that owns a control rendered inside it. */
export function popupAncestor(child: Locator): Locator {
  return child.locator('xpath=ancestor::*[@popover][1]');
}

/** Applies one accessibility preference used by the Skin surface matrix. */
export async function emulatePreference(
  page: Page,
  preference: 'reduced-transparency' | 'contrast-more' | 'forced-colors'
) {
  if (preference === 'reduced-transparency') {
    const session = await page.context().newCDPSession(page);

    await session.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
    });
    return;
  }

  if (preference === 'contrast-more') {
    await page.emulateMedia({ contrast: 'more' });
    return;
  }

  await page.emulateMedia({ forcedColors: 'active' });
}

/** Reads preference-sensitive paint without coupling the test to exact colors. */
export async function surfaceContract(target: Locator) {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    const frame = getComputedStyle(element, '::after');
    const background = style.backgroundColor;
    const slashAlpha = background.match(/\/\s*([\d.]+)/)?.[1];
    const commaAlpha = background.startsWith('rgba(') ? background.match(/,\s*([\d.]+)\s*\)$/)?.[1] : undefined;
    const alpha = Number(slashAlpha ?? commaAlpha ?? 1);
    const opaqueBackground = alpha === 1;
    const forcedColors = matchMedia('(forced-colors: active)').matches;
    const paintedShadow = style.boxShadow
      .split(/,(?![^()]*(?:\)|$))/)
      .some((shadow) => !/rgba?\([^)]*(?:\/|,)\s*0(?:\.0+)?\)/.test(shadow) && /-?[1-9]\d*(?:\.\d+)?px/.test(shadow));

    return {
      backdropFilter: forcedColors
        ? 'system'
        : opaqueBackground
          ? 'occluded'
          : style.backdropFilter === 'none'
            ? 'none'
            : 'painted',
      background: alpha === 0 ? 'transparent' : 'painted',
      border: Number.parseFloat(style.borderWidth) === 0 ? 'none' : 'painted',
      frame: frame.display === 'none' || frame.boxShadow === 'none' ? 'none' : 'painted',
      shadow: paintedShadow ? 'painted' : 'none',
      side: element.getAttribute('data-side'),
    };
  });
}

/** Waits until asynchronously populated dialog content has stopped changing. */
export async function waitForStableText(target: Locator) {
  let previous = '';
  let stableReads = 0;

  for (let index = 0; index < 20; index++) {
    const current = await target.innerText();

    stableReads = current !== '' && current === previous ? stableReads + 1 : 0;

    if (stableReads === 2) return;

    previous = current;
    await target.page().waitForTimeout(100);
  }

  throw new Error('Dialog content did not settle.');
}

/** Replaces browser-specific media error details with stable equivalent copy for geometry checks. */
export async function normalizeErrorDialogCopy(dialog: Locator) {
  await dialog.locator('[id*="error-dialog-title"]').evaluate((element) => {
    element.textContent = 'Something went wrong.';
  });
  await dialog.locator('[id*="error-dialog-desc"]').evaluate((element) => {
    element.textContent = 'This media could not be loaded.';
  });
}
