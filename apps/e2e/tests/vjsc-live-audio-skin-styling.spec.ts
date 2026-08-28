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
  { framework: 'react', skin: 'default-live-audio' },
  { framework: 'react', skin: 'minimal-live-audio' },
  { framework: 'html', skin: 'default-live-audio' },
  { framework: 'html', skin: 'minimal-live-audio' },
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

  test(`${variant.framework} ${variant.skin} preserves live audio controls and popup styling`, async ({ page }) => {
    const contracts = [];

    for (const configuration of VJSC_CONFIGURATIONS) {
      await test.step(`${configuration.source}/${configuration.style}`, async () => {
        const root = await openVariant(page, variant, configuration.style, 672, configuration.source);

        contracts.push(await interactionContract(page, root));
      });
    }

    for (const key of ['button', 'popover', 'tooltip'] as const) {
      expect(contracts[1][key], `${key}: VJSC CSS matches legacy`).toEqual(contracts[0][key]);
      expect(contracts[2][key], `${key}: VJSC Tailwind matches CSS`).toEqual(contracts[1][key]);
    }

    expect(contracts[1]).toMatchObject({
      nestedButtons: 0,
      noPlaybackRate: true,
      noSeek: true,
      statusRegions: 1,
      popover: { visible: true },
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

  test(`${variant.framework} ${variant.skin} removes popup movement under reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    for (const style of STYLES) {
      const root = await openVariant(page, variant, style, 672);
      const mute = root.getByRole('button', { name: /mute/i });

      await mute.hover();

      const volume = root.getByRole('slider', { name: /volume/i });

      await expect(volume).toBeVisible();
      expect((await popupContract(popupAncestor(volume))).motion.every(({ duration }) => duration === '0s')).toBe(true);
    }
  });

  for (const preference of ['reduced-transparency', 'contrast-more', 'forced-colors'] as const) {
    test(`${variant.framework} ${variant.skin} keeps ${preference} surfaces in sync`, async ({ page }) => {
      await emulatePreference(page, preference);

      const contracts = [];

      for (const configuration of VJSC_CONFIGURATIONS) {
        const root = await openVariant(page, variant, configuration.style, 672, configuration.source);
        const mute = root.getByRole('button', { name: /mute/i });

        await mute.hover();

        const volume = root.getByRole('slider', { name: /volume/i });

        await expect(volume).toBeVisible();
        contracts.push({
          controls: await surfaceContract(root.locator('.media-controls').first()),
          popup: await surfaceContract(popupAncestor(volume)),
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
  media = 'hls-live',
  expectPlay = true
): Promise<Locator> {
  const query = new URLSearchParams({ source, ...variant, style, media, width: String(width) });

  await page.goto(`/?${query}`, { waitUntil: 'domcontentloaded' });

  const root = page.getByRole('group', { name: 'Media player' });

  await expect(root).toBeVisible();

  if (expectPlay) {
    await expect(root.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    const live = root.getByRole('button', { name: /live/i });

    await expect(live).toBeVisible({ timeout: 20_000 });

    if ((await live.getAttribute('data-live-edge')) === null && (await live.isEnabled())) {
      try {
        await live.click({ timeout: 2_000 });
      } catch (error) {
        // The live stream can reach its edge and disable the button between the
        // enabled check and click. Only suppress that expected race.
        if ((await live.getAttribute('data-live-edge')) === null) throw error;
      }
    }

    await expect(live).toHaveAttribute('data-live-edge', '', { timeout: 20_000 });
  }

  await expect.poll(() => root.evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(width);
  await root.evaluate((element) => {
    if (!(element instanceof HTMLElement)) return;

    const { top } = element.getBoundingClientRect();

    element.style.translate = `0 ${Math.round(top) - top}px`;
  });
  await root.locator('audio').evaluateAll((elements) => {
    for (const element of elements) element.pause();
  });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  return root;
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
    const controls = [...element.querySelectorAll<HTMLElement>('.media-controls')].find((candidate) => {
      const rect = candidate.getBoundingClientRect();

      return getComputedStyle(candidate).display !== 'contents' && rect.width > 0 && rect.height > 0;
    });

    if (!controls) {
      const play = element.querySelector<HTMLElement>('[aria-label="Play"]');
      let candidate = play?.parentElement;

      while (
        candidate &&
        (!(
          candidate.querySelector('[data-live-edge], [aria-label="Seek to live edge"]') &&
          candidate.querySelector('[aria-label^="Mute"]')
        ) ||
          getComputedStyle(candidate).display === 'contents' ||
          candidate.getBoundingClientRect().width === 0)
      ) {
        candidate = candidate.parentElement;
      }

      if (!candidate) throw new Error('Expected live audio controls.');

      return readLayout(candidate);
    }

    return readLayout(controls);

    function readLayout(target: HTMLElement) {
      const style = getComputedStyle(target);
      const live = element.querySelector<HTMLElement>('[data-live-edge], [aria-label="Seek to live edge"]');
      const buttons = [...element.querySelectorAll<HTMLElement>('[role=button]')]
        .filter((button) => {
          const rect = button.getBoundingClientRect();

          return rect.width > 0 && rect.height > 0 && !button.closest('[role=dialog], [role=alertdialog]');
        })
        .map((button) => ({
          label: button === live ? 'live' : button.getAttribute('aria-label'),
          rect: relativeRect(button),
        }));

      return {
        buttons,
        controls: {
          backdropFilter: style.backdropFilter === 'none' ? 'none' : 'painted',
          background: style.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : 'painted',
          borderRadius: Number.parseFloat(style.borderRadius) > 50 ? 'pill' : style.borderRadius,
          display: style.display,
          gap: style.gap,
          padding: style.padding,
          rect: relativeRect(target),
        },
        root: { height: round(rootRect.height), width: round(rootRect.width) },
      };
    }
  });
}

async function interactionContract(page: Page, root: Locator) {
  const play = root.getByRole('button', { name: /^(?:Play|Pause)$/ });

  await play.hover();

  const tooltip = page.locator('[popover]:visible').filter({ hasText: 'Play' }).first();

  await expect(tooltip).toBeVisible();
  const tooltipContract = { visible: true, ...(await popupContract(tooltip)) };

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

  const mute = root.getByRole('button', { name: /mute/i });

  await mute.hover();

  const volume = root.getByRole('slider', { name: /volume/i });

  await expect(volume).toBeVisible();
  const popover = { visible: true, ...(await popupContract(popupAncestor(volume))) };

  await page.mouse.move(0, 0);
  await expect(volume).toBeHidden();
  await mute.hover();
  await expect(volume).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(volume).toBeHidden();

  return {
    button,
    nestedButtons: await root.locator('button button').count(),
    noPlaybackRate: (await root.getByRole('button', { name: /playback rate/i }).count()) === 0,
    noSeek: (await root.getByRole('slider', { name: 'Seek' }).count()) === 0,
    popover,
    statusRegions: await root.getByRole('status').count(),
    tooltip: tooltipContract,
  };
}
