import { expect, type Locator, type Page, test } from '@playwright/test';

import { AUDIO_PAGES, type PageEntry, VIDEO_PAGES } from '../fixtures/media';
import { mockPresentation } from '../fixtures/presentation';
import { DATA_ATTRS, SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

const PAGES = [...AUDIO_PAGES, ...VIDEO_PAGES].filter(
  ({ path }) => path.endsWith('-audio-mp4.html') || path.endsWith('-video-mp4.html')
);

function getMediaValue(page: Page, key: 'currentTime' | 'volume'): Promise<number> {
  return page.evaluate(
    ({ selector, key }) => {
      const host = document.querySelector(selector) as HTMLMediaElement | null;
      const media = (host?.querySelector?.('video, audio') as HTMLMediaElement) ?? host;

      return media?.[key] ?? 0;
    },
    { selector: SELECTORS.media, key }
  );
}

async function expectTabFocus(page: Page, element: Locator): Promise<void> {
  await page.keyboard.press('Tab');
  await expect(element).toBeFocused();
}

for (const entry of PAGES as readonly PageEntry[]) {
  const isAudio = entry.media === 'audio';

  test.describe(`Keyboard Navigation — ${entry.name}`, () => {
    let player: PlayerPage;

    test.beforeEach(async ({ page }) => {
      if (!isAudio) await mockPresentation(page);

      player = new PlayerPage(page);
      await page.goto(entry.path);
      await player.waitForMediaReady();
      await player.showControls();
    });

    test('tabs through every available control', async ({ browserName, page }) => {
      await player.playerRoot.evaluate((root) => {
        const before = document.createElement('button');
        const after = document.createElement('button');

        before.tabIndex = 0;
        after.tabIndex = 0;
        before.dataset.focusSentinel = 'before';
        after.dataset.focusSentinel = 'after';
        root.before(before);
        root.after(after);
      });
      const before = page.locator('[data-focus-sentinel="before"]');
      const after = page.locator('[data-focus-sentinel="after"]');

      await before.focus();

      await expectTabFocus(page, player.playerRoot);

      if (!isAudio && browserName === 'firefox') {
        await expectTabFocus(page, page.locator('video').first());
      }

      await expectTabFocus(page, player.playButton);

      if (isAudio) {
        await expectTabFocus(page, player.seekBackward);
        await expectTabFocus(page, player.seekForward);
      } else {
        await expectTabFocus(page, player.muteButton);
        await expect(player.volumeSlider).toBeVisible();
        await expectTabFocus(page, player.volumeSliderThumb);
      }

      await expectTabFocus(page, player.timeSliderThumb);
      await expectTabFocus(page, player.timeToggle);

      if (isAudio) {
        await expectTabFocus(page, player.playbackRateButton);
        await expectTabFocus(page, player.muteButton);
        await expect(player.volumeSlider).toBeVisible();
        await expectTabFocus(page, player.volumeSliderThumb);
      } else {
        await expectTabFocus(page, player.settingsButton);

        for (const control of [player.castButton, player.airPlayButton, player.pipButton, player.fullscreenButton]) {
          if (await control.isVisible()) await expectTabFocus(page, control);
        }
      }

      await page.keyboard.press('Tab');
      await expect(after).toBeFocused();

      if (isAudio) await expect(player.volumeSlider).toBeHidden();

      await page.keyboard.press('Shift+Tab');
      await expect(isAudio ? player.muteButton : player.fullscreenButton).toBeFocused();
    });

    test('operates buttons, sliders, and time display from the keyboard', async ({ page }) => {
      await player.playButton.focus();
      await page.keyboard.press('Space');
      await expect(player.playButton).not.toHaveAttribute(DATA_ATTRS.paused);
      await page.keyboard.press('Enter');
      await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');

      await player.timeSliderThumb.focus();
      const timeBefore = await getMediaValue(page, 'currentTime');

      await page.keyboard.press('ArrowRight');
      await expect.poll(() => getMediaValue(page, 'currentTime')).toBeGreaterThan(timeBefore);
      await page.keyboard.press('Home');
      await expect.poll(() => getMediaValue(page, 'currentTime')).toBe(0);

      const timeType = await player.timeToggle.getAttribute('data-type');

      await player.timeToggle.focus();
      await page.keyboard.press('Enter');
      await expect(player.timeToggle).not.toHaveAttribute('data-type', timeType!);
      await page.keyboard.press('Space');
      await expect(player.timeToggle).toHaveAttribute('data-type', timeType!);

      await player.muteButton.focus();
      await page.keyboard.press('Space');
      await expect(player.muteButton).not.toHaveAttribute(DATA_ATTRS.muted);
      await page.keyboard.press('Enter');
      await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.muted, '');

      await expect(player.volumeSlider).toBeVisible();
      await player.volumeSliderThumb.focus();
      await page.keyboard.press('End');
      await expect.poll(() => getMediaValue(page, 'volume')).toBe(1);
      await page.keyboard.press('ArrowDown');
      await expect.poll(() => getMediaValue(page, 'volume')).toBeLessThan(1);

      if (isAudio) {
        await player.seekTo(50);
        const middle = await getMediaValue(page, 'currentTime');

        await player.seekBackward.focus();
        await page.keyboard.press('Enter');
        await expect.poll(() => getMediaValue(page, 'currentTime')).toBeLessThan(middle);
        const back = await getMediaValue(page, 'currentTime');

        await player.seekForward.focus();
        await page.keyboard.press('Space');
        await expect.poll(() => getMediaValue(page, 'currentTime')).toBeGreaterThan(back);
      } else {
        await player.pipButton.focus();
        await page.keyboard.press('Enter');
        await expect(player.pipButton).toHaveAttribute(DATA_ATTRS.pip, '');
        await page.keyboard.press('Space');
        await expect(player.pipButton).not.toHaveAttribute(DATA_ATTRS.pip);

        await player.fullscreenButton.focus();
        await page.keyboard.press('Enter');
        await expect(player.fullscreenButton).toHaveAttribute(DATA_ATTRS.fullscreen, '');
        await page.keyboard.press('Space');
        await expect(player.fullscreenButton).not.toHaveAttribute(DATA_ATTRS.fullscreen);
      }
    });

    if (isAudio) {
      test('navigates the playback rate menu and restores focus', async ({ page }) => {
        const trigger = player.playbackRateButton;
        const menu = page.getByRole('menu');
        const checkedOption = menu.getByRole('menuitemradio', { checked: true });
        const focusedOption = menu.locator('[role="menuitemradio"]:focus');

        await trigger.focus();
        await page.keyboard.press('Enter');
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await expect(checkedOption).toBeFocused();

        await page.keyboard.press('Escape');
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await expect(trigger).toBeFocused();

        await page.keyboard.press('Space');
        await expect(checkedOption).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(focusedOption).toBeFocused();
        const nextRate = await focusedOption.getAttribute(DATA_ATTRS.rate);

        expect(nextRate).not.toBeNull();

        await page.keyboard.press('Enter');
        await expect(trigger).toHaveAttribute(DATA_ATTRS.rate, nextRate!);
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await expect(trigger).toBeFocused();

        await page.keyboard.press('Enter');
        await expect(menu.getByRole('menuitemradio', { checked: true })).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await expect(player.muteButton).toBeFocused();
      });
    } else {
      test('operates captions with Enter and Space when a track is available', async ({ page }) => {
        await page.evaluate(() => {
          const video = document.querySelector('video');
          if (!video) return;

          const track = document.createElement('track');

          track.kind = 'subtitles';
          track.label = 'English';
          track.srclang = 'en';
          track.src = `data:text/vtt,${encodeURIComponent('WEBVTT\n\n00:00:00.000 --> 00:00:30.000\nTest caption')}`;
          video.append(track);
        });

        await expect(player.captionsButton).toBeVisible();
        await player.captionsButton.focus();
        await page.keyboard.press('Space');
        await expect(player.captionsButton).toHaveAttribute(DATA_ATTRS.active, '');
        await page.keyboard.press('Enter');
        await expect(player.captionsButton).not.toHaveAttribute(DATA_ATTRS.active);
      });

      test('navigates settings submenus and restores focus', async ({ page }) => {
        await player.settingsButton.focus();
        await page.keyboard.press('Enter');
        await expect(player.settingsSpeedItem).toBeFocused();

        await page.keyboard.press('ArrowRight');
        await expect(player.activeMenuPanel).toBeVisible();
        await expect(player.activeMenuPanel.getByRole('menuitem').first()).toBeFocused();

        await page.keyboard.press('ArrowLeft');
        await expect(player.activeMenuPanel).not.toBeVisible();
        await expect(player.settingsSpeedItem).toBeFocused();

        await page.keyboard.press('Escape');
        await expect(player.settingsButton).toHaveAttribute('aria-expanded', 'false');
        await expect(player.settingsButton).toBeFocused();
      });
    }
  });
}
