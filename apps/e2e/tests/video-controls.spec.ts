import { expect, test } from '@playwright/test';
import { ALL_VIDEO_PAGES, type PageEntry } from '../fixtures/media';
import { DATA_ATTRS, SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

for (const { name, path, mediaRenderer, skipBrowsers } of ALL_VIDEO_PAGES as readonly PageEntry[]) {
  test.describe(`Video Controls — ${name}`, () => {
    test.skip(({ browserName }) => {
      return skipBrowsers?.includes(browserName as 'chromium' | 'webkit' | 'firefox') ?? false;
    }, 'Skipped on this browser');
    let player: PlayerPage;

    test.beforeEach(async ({ page }) => {
      player = new PlayerPage(page);
      await page.goto(path);
      await player.waitForMediaReady();
    });

    // --- Grouped: control presence & attributes (one navigation) ---

    test('all controls are present with correct attributes', async () => {
      await expect(player.seekForward).toBeAttached();
      await expect(player.seekForward).toHaveAttribute(DATA_ATTRS.direction, 'forward');
      await expect(player.seekBackward).toBeAttached();
      await expect(player.seekBackward).toHaveAttribute(DATA_ATTRS.direction, 'backward');
      await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.volumeLevel);
      await expect(player.fullscreenButton).toHaveAttribute(DATA_ATTRS.availability);
      await expect(player.pipButton).toHaveAttribute(DATA_ATTRS.availability);
      await expect(player.captionsButton).toHaveAttribute(DATA_ATTRS.availability);
      await expect(player.duration).not.toHaveText('');
      await player.showControls();
      await expect(player.controls).toBeAttached();
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

    // --- Seek ---

    test('seek forward advances playback', async () => {
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

    test('time slider shows interactive state on hover', async () => {
      await player.hoverTimeSlider(50);
      await expect(player.timeSlider).toHaveAttribute(DATA_ATTRS.pointing, '');
    });

    // --- Mute ---

    test('mute button toggles mute', async () => {
      await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.muted, '');
      await player.muteButton.click();
      await expect(player.muteButton).not.toHaveAttribute(DATA_ATTRS.muted);
      await player.muteButton.click();
      await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.muted, '');
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

    // --- Poster ---

    test('poster hides after playback starts', async ({ page }) => {
      await player.play();

      const posterVisible = await page.evaluate((attr) => {
        const htmlPoster = document.querySelector('media-poster');
        if (htmlPoster) return htmlPoster.hasAttribute(attr);

        const reactPoster = document.querySelector(`img[${attr}]`);
        return !!reactPoster;
      }, DATA_ATTRS.visible);

      expect(posterVisible).toBe(false);
    });
  });
}
