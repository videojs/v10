import { expect, type Locator, type Page } from '@playwright/test';
import { DATA_ATTRS, SELECTORS } from '../fixtures/selectors';

/**
 * Page Object Model for the Video.js player.
 *
 * Uses cross-renderer selectors that work for both:
 * - HTML (Web Components): custom element tags like `media-play-button`
 * - React: standard elements with CSS classes like `.media-button--play`
 *
 * Both renderers share the same data attributes for state, so all
 * assertions against `data-paused`, `data-muted`, etc. are portable.
 *
 * Playwright auto-pierces Shadow DOM for HTML custom elements.
 */
export class PlayerPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // --- Control locators ---

  get playButton(): Locator {
    return this.page.locator(SELECTORS.playButton).first();
  }

  get seekForward(): Locator {
    return this.page.locator(SELECTORS.seekForward).first();
  }

  get seekBackward(): Locator {
    return this.page.locator(SELECTORS.seekBackward).first();
  }

  get timeSlider(): Locator {
    return this.page.locator(SELECTORS.timeSlider).first();
  }

  get muteButton(): Locator {
    return this.page.locator(SELECTORS.muteButton).first();
  }

  get volumeSlider(): Locator {
    return this.page.locator(SELECTORS.volumeSlider).first();
  }

  get fullscreenButton(): Locator {
    return this.page.locator(SELECTORS.fullscreenButton).first();
  }

  get pipButton(): Locator {
    return this.page.locator(SELECTORS.pipButton).first();
  }

  get captionsButton(): Locator {
    return this.page.locator(SELECTORS.captionsButton).first();
  }

  get playbackRateButton(): Locator {
    return this.page.locator(SELECTORS.playbackRateButton).first();
  }

  get settingsButton(): Locator {
    return this.page.locator(SELECTORS.settingsButton).first();
  }

  get settingsCaptionsItem(): Locator {
    return this.page.locator(SELECTORS.settingsCaptionsItem).first();
  }

  get settingsSpeedItem(): Locator {
    return this.page.locator(SELECTORS.settingsSpeedItem).first();
  }

  get poster(): Locator {
    return this.page.locator(SELECTORS.poster).first();
  }

  get bufferingIndicator(): Locator {
    return this.page.locator(SELECTORS.bufferingIndicator).first();
  }

  get controls(): Locator {
    return this.page.locator(SELECTORS.controls).first();
  }

  get currentTime(): Locator {
    return this.page.locator(SELECTORS.currentTime).first();
  }

  get duration(): Locator {
    return this.page.locator(SELECTORS.duration).first();
  }

  get thumbnail(): Locator {
    return this.page.locator(SELECTORS.thumbnail).first();
  }

  get popover(): Locator {
    return this.page.locator(SELECTORS.popover).first();
  }

  /** Locator for the outermost player wrapper (works for both video and audio). */
  get playerRoot(): Locator {
    return this.page.locator(SELECTORS.container).first();
  }

  get videoPlayer(): Locator {
    return this.page.locator(SELECTORS.videoPlayer).first();
  }

  get audioPlayer(): Locator {
    return this.page.locator(SELECTORS.audioPlayer).first();
  }

  // --- Actions ---

  /** Wait for the player to load media and show controls. */
  async waitForMediaReady({ muted = true }: { muted?: boolean } = {}): Promise<void> {
    await this.playButton.waitFor({ state: 'attached', timeout: 20_000 });

    // Wait for the media element to have at least metadata loaded.
    // SPF-based renderers (simple-hls-video) with preload="metadata" need
    // time to resolve the manifest before seeks or other interactions work.
    await this.page.waitForFunction(
      (selector) => {
        const media = document.querySelector(selector) as HTMLMediaElement | null;
        const actual = (media?.querySelector?.('video') as HTMLMediaElement) ?? media;
        return actual && actual.readyState >= 1;
      },
      SELECTORS.media,
      { timeout: 20_000 }
    );

    if (muted) {
      // Mute the media element to prevent audio during test runs.
      // Chromium supports --mute-audio but WebKit has no browser-level
      // equivalent, so we mute the renderer directly for cross-browser silence.
      await this.page.evaluate((selector) => {
        const media = document.querySelector(selector) as HTMLMediaElement | null;
        const actual = (media?.querySelector?.('video') as HTMLMediaElement) ?? media;
        if (actual) actual.muted = true;
      }, SELECTORS.media);
    }
  }

  /** Click play and wait for the paused attribute to be removed. */
  async play(): Promise<void> {
    await this.playButton.click();
    await expect(this.playButton).not.toHaveAttribute(DATA_ATTRS.paused, { timeout: 5_000 });
  }

  /** Click pause and wait for the paused attribute to appear. */
  async pause(): Promise<void> {
    // In Firefox headless (especially audio), controls may hide after play
    // starts and force-click doesn't reliably dispatch to Shadow DOM buttons.
    // Fall back to dispatching click via JS, then verify UI state.
    await this.playButton.dispatchEvent('click');
    await expect(this.playButton).toHaveAttribute(DATA_ATTRS.paused, '', { timeout: 5_000 });
  }

  async openPlaybackRateSettings(): Promise<void> {
    await this.showControls();
    await this.settingsButton.click();
    await expect(this.settingsSpeedItem).toBeVisible();
    await this.settingsSpeedItem.click();
    await expect(this.page.locator(`${SELECTORS.activeMenuPanel} [role="menuitemradio"]`).first()).toBeVisible();
  }

  async openCaptionsSettings(): Promise<void> {
    await this.showControls();
    await this.settingsButton.click();
    await expect(this.settingsCaptionsItem).toBeVisible();
    await this.settingsCaptionsItem.click();
    await expect(this.page.locator(SELECTORS.activeMenuRadioItems).first()).toBeVisible();
  }

  async getPlaybackRate(): Promise<number> {
    return this.page.evaluate((selector) => {
      const media = document.querySelector(selector) as HTMLMediaElement | null;
      const actual = (media?.querySelector?.('video') as HTMLMediaElement) ?? media;
      return actual?.playbackRate ?? 1;
    }, SELECTORS.media);
  }

  /** Click at a percentage position on the time slider. */
  async seekTo(percent: number): Promise<void> {
    // Wait for readyState >= 1 (HAVE_METADATA) and a non-zero duration.
    // On WebKit, seeking with no buffered data resolves to currentTime 0
    // instead of the requested position.
    await this.page.waitForFunction(
      (selector) => {
        const media = document.querySelector(selector) as HTMLMediaElement | null;
        const actual = (media?.querySelector?.('video') as HTMLMediaElement) ?? media;
        return actual && actual.readyState >= 1 && actual.duration > 0 && Number.isFinite(actual.duration);
      },
      SELECTORS.media,
      { timeout: 30_000 }
    );

    const box = await this.timeSlider.boundingBox();
    if (!box) throw new Error('Time slider not visible');

    const x = box.x + box.width * (percent / 100);
    const y = box.y + box.height / 2;
    await this.page.mouse.click(x, y);

    // Wait for the seek to complete
    await this.page.waitForTimeout(500);
  }

  /** Hover over the time slider at a percentage position. */
  async hoverTimeSlider(percent: number): Promise<void> {
    const box = await this.timeSlider.boundingBox();
    if (!box) throw new Error('Time slider not visible');

    const x = box.x + box.width * (percent / 100);
    const y = box.y + box.height / 2;
    await this.page.mouse.move(x, y);
  }

  /**
   * Opens the playback rate menu and selects the first option that differs from the current rate.
   * Skins expose rate via a menu (not cycle-on-trigger).
   */
  async selectAlternativePlaybackRate(): Promise<void> {
    const initialRate = await this.getPlaybackRate();
    const usesSettingsMenu = (await this.settingsButton.count()) > 0;

    if (usesSettingsMenu) {
      await this.openPlaybackRateSettings();
    } else {
      await this.showControls();
      await this.playbackRateButton.click();
    }

    const uncheckedPlaybackRateOptions = SELECTORS.openPlaybackRateMenuRadioItems
      .split(', ')
      .map((selector) => `${selector.trim()}[aria-checked="false"]`)
      .join(', ');
    const option = this.page
      .locator(
        usesSettingsMenu
          ? `${SELECTORS.activeMenuPanel} [role="menuitemradio"][aria-checked="false"]`
          : uncheckedPlaybackRateOptions
      )
      .first();
    await expect(option).toBeVisible({ timeout: 5_000 });
    // Menu popovers can intercept pointer events on nested radio items.
    await option.dispatchEvent('click');

    await expect.poll(async () => this.getPlaybackRate()).not.toBe(initialRate);
  }

  /** Hover over the player area to trigger user-active state and show controls. */
  async showControls(): Promise<void> {
    // Use the play button as anchor — it's always inside the player
    const btn = this.playButton;
    const box = await btn.boundingBox();
    if (!box) throw new Error('Play button not visible — cannot show controls');

    await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await this.page.waitForTimeout(200);
  }
}
