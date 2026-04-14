import { expect, test } from '@playwright/test';
import { ALL_VIDEO_PAGES, type PageEntry } from '../fixtures/media';
import { DATA_ATTRS, SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

for (const { name, path, mediaRenderer, skipBrowsers } of ALL_VIDEO_PAGES as readonly PageEntry[]) {
  test.describe(`Video Controls — ${name}`, () => {
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
      await expect(player.seekForward).toHaveAttribute(DATA_ATTRS.direction, 'forward');
    });

    test('seek backward button is present', async () => {
      await expect(player.seekBackward).toBeAttached();
      await expect(player.seekBackward).toHaveAttribute(DATA_ATTRS.direction, 'backward');
    });

    test('seek forward advances playback', async () => {
      // Renderers that rely on native <video> src or SPF can't complete seeks
      // before playback — no segment data is buffered at the target position so
      // 'seeked' never fires and data-started is never set.
      test.skip(
        mediaRenderer === 'simple-hls-video' || mediaRenderer === 'native-hls-video',
        'seek before playback not yet supported'
      );

      await player.seekForward.click();
      await expect(player.playButton).toHaveAttribute(DATA_ATTRS.started, '');
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

    test('time slider shows interactive state on hover', async ({ page }) => {
      await player.hoverTimeSlider(50);
      await expect(player.timeSlider).toHaveAttribute(DATA_ATTRS.pointing, '');
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

    // --- Fullscreen ---

    test('fullscreen button has availability attribute', async () => {
      await expect(player.fullscreenButton).toHaveAttribute(DATA_ATTRS.availability);
    });

    // --- Picture-in-Picture ---

    test('pip button has availability attribute', async () => {
      await expect(player.pipButton).toHaveAttribute(DATA_ATTRS.availability);
    });

    // --- Captions ---

    test('captions button has availability attribute', async () => {
      await expect(player.captionsButton).toHaveAttribute(DATA_ATTRS.availability);
    });

    // --- Poster ---

    test('poster hides after playback starts', async ({ page }) => {
      await player.play();

      // The poster should either be removed or lose data-visible.
      // HTML: <media-poster> loses data-visible attribute
      // React: <img data-visible> loses data-visible (element may still exist)
      const posterVisible = await page.evaluate((attr) => {
        // Check HTML custom element
        const htmlPoster = document.querySelector('media-poster');
        if (htmlPoster) return htmlPoster.hasAttribute(attr);

        // Check React poster (img with data-visible)
        const reactPoster = document.querySelector(`img[${attr}]`);
        return !!reactPoster;
      }, DATA_ATTRS.visible);

      expect(posterVisible).toBe(false);
    });

    // --- Controls Visibility ---

    test('controls respond to hover', async () => {
      await player.showControls();
      await expect(player.controls).toBeAttached();
    });

    // --- Duration Display ---

    test('duration display shows non-empty text', async () => {
      await expect(player.duration).not.toHaveText('');
    });
  });
}
