import { expect, test } from '@playwright/test';
import { AUDIO_PAGES, type PageEntry } from '../fixtures/media';
import { DATA_ATTRS, SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

for (const { name, path, skipBrowsers } of AUDIO_PAGES as readonly PageEntry[]) {
  test.describe(`Audio Controls — ${name}`, () => {
    test.skip(({ browserName }) => {
      return skipBrowsers?.includes(browserName as 'chromium' | 'webkit' | 'firefox') ?? false;
    }, `Skipped on this browser`);
    let player: PlayerPage;

    test.beforeEach(async ({ page }) => {
      player = new PlayerPage(page);
      await page.goto(path);
      await player.waitForMediaReady();
    });

    // --- Play / Pause ---

    test('play button starts playback', async () => {
      await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');
      await player.play();
      await expect(player.playButton).not.toHaveAttribute(DATA_ATTRS.paused);
    });

    test('play button pauses playback', async () => {
      await player.play();
      await player.pause();
      await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');
    });

    // --- Seek Buttons ---

    test('seek forward button is present', async () => {
      await expect(player.seekForward).toBeAttached();
    });

    test('seek backward button is present', async () => {
      await expect(player.seekBackward).toBeAttached();
    });

    // --- Time Slider ---

    test('time slider allows seeking', async ({ page }) => {
      await player.seekTo(50);

      await expect
        .poll(
          async () => {
            return page.evaluate((selector) => {
              const el = document.querySelector(selector);
              const media = (el?.querySelector?.('video') as HTMLMediaElement) ?? (el as HTMLMediaElement);
              return media?.currentTime ?? 0;
            }, SELECTORS.media);
          },
          { timeout: 10_000 }
        )
        .toBeGreaterThan(0);
    });

    // --- Mute / Volume ---

    test('mute button toggles mute', async () => {
      // Media starts muted (see PlayerPage.waitForMediaReady)
      await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.muted, '');
      await player.muteButton.click();
      await expect(player.muteButton).not.toHaveAttribute(DATA_ATTRS.muted);
      await player.muteButton.click();
      await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.muted, '');
    });

    test('mute button shows volume level', async () => {
      await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.volumeLevel);
    });

    // --- Playback Rate ---

    test('playback rate button cycles rates', async () => {
      const rateBtn = player.playbackRateButton;
      const initialRate = await rateBtn.getAttribute(DATA_ATTRS.rate);

      await rateBtn.click();
      await player.page.waitForTimeout(200);

      const newRate = await rateBtn.getAttribute(DATA_ATTRS.rate);
      expect(newRate).not.toBe(initialRate);
    });

    // Audio skin does NOT have: fullscreen, PiP, captions, poster, storyboard
  });
}
