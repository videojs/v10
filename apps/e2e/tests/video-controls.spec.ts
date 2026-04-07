import { expect, test } from '@playwright/test';
import { ALL_VIDEO_PAGES } from '../fixtures/media';
import { PlayerPage } from '../page-objects/player';

for (const { name, path, media } of ALL_VIDEO_PAGES) {
  test.describe(`Video Controls — ${name}`, () => {
    let player: PlayerPage;

    test.beforeEach(async ({ page }) => {
      player = new PlayerPage(page);
      await page.goto(path);
      await player.waitForMediaReady();
    });

    // --- Play / Pause ---

    test('play button starts playback', async () => {
      await expect(player.playButton).toHaveAttribute('data-paused', '');
      await player.play();
      await expect(player.playButton).not.toHaveAttribute('data-paused');
    });

    test('play button pauses playback', async () => {
      await player.play();
      await player.pause();
      await expect(player.playButton).toHaveAttribute('data-paused', '');
    });

    // --- Seek Buttons ---

    test('seek forward button is present', async () => {
      await expect(player.seekForward).toBeAttached();
      await expect(player.seekForward).toHaveAttribute('data-direction', 'forward');
    });

    test('seek backward button is present', async () => {
      await expect(player.seekBackward).toBeAttached();
      await expect(player.seekBackward).toHaveAttribute('data-direction', 'backward');
    });

    test('seek forward advances playback', async () => {
      // Clicking seek forward should trigger a seek and mark the player as started
      await player.seekForward.click();
      await expect(player.playButton).toHaveAttribute('data-started', '');
    });

    // --- Time Slider ---

    test('time slider allows seeking', async ({ page, browserName }) => {
      // WebKit + hls.js: slider click triggers seek but currentTime doesn't
      // update within the poll timeout. Likely a buffer-append timing issue
      // in WebKit's MSE implementation.
      test.skip(browserName === 'webkit' && media === 'hls', 'WebKit hls.js seek timing');

      await player.seekTo(50);

      await expect
        .poll(
          async () => {
            return page.evaluate(() => {
              const el = document.querySelector('video, audio, hls-video, dash-video');
              const media = (el?.querySelector?.('video') as HTMLMediaElement) ?? (el as HTMLMediaElement);
              return media?.currentTime ?? 0;
            });
          },
          { timeout: 10_000 }
        )
        .toBeGreaterThan(0);
    });

    test('time slider shows interactive state on hover', async ({ page }) => {
      await player.hoverTimeSlider(50);
      await expect(player.timeSlider).toHaveAttribute('data-pointing', '');
    });

    // --- Mute / Volume ---

    test('mute button toggles mute', async () => {
      await expect(player.muteButton).not.toHaveAttribute('data-muted');
      await player.muteButton.click();
      await expect(player.muteButton).toHaveAttribute('data-muted', '');
      await player.muteButton.click();
      await expect(player.muteButton).not.toHaveAttribute('data-muted');
    });

    test('mute button shows volume level', async () => {
      await expect(player.muteButton).toHaveAttribute('data-volume-level');
    });

    // --- Playback Rate ---

    test('playback rate button cycles rates', async () => {
      const rateBtn = player.playbackRateButton;
      const initialRate = await rateBtn.getAttribute('data-rate');

      await rateBtn.click();
      await player.page.waitForTimeout(200);

      const newRate = await rateBtn.getAttribute('data-rate');
      expect(newRate).not.toBe(initialRate);
    });

    // --- Fullscreen ---

    test('fullscreen button has availability attribute', async () => {
      await expect(player.fullscreenButton).toHaveAttribute('data-availability');
    });

    // --- Picture-in-Picture ---

    test('pip button has availability attribute', async () => {
      await expect(player.pipButton).toHaveAttribute('data-availability');
    });

    // --- Captions ---

    test('captions button has availability attribute', async () => {
      await expect(player.captionsButton).toHaveAttribute('data-availability');
    });

    // --- Poster ---

    test('poster hides after playback starts', async ({ page }) => {
      await player.play();

      // The poster should either be removed or lose data-visible.
      // HTML: <media-poster> loses data-visible attribute
      // React: <img data-visible> loses data-visible (element may still exist)
      const posterVisible = await page.evaluate(() => {
        // Check HTML custom element
        const htmlPoster = document.querySelector('media-poster');
        if (htmlPoster) return htmlPoster.hasAttribute('data-visible');

        // Check React poster (img inside skin with data-visible)
        const reactPoster = document.querySelector('img[data-visible]');
        return !!reactPoster;
      });

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
