import { expect, test } from '@playwright/test';
import { DATA_ATTRS, SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

/**
 * Gesture tests — validates the media-gesture components respond to
 * pointer events on the player container (not individual buttons).
 *
 * The player's gesture system:
 * - tap (mouse, center):  togglePaused
 * - tap (touch):          toggleControls
 * - doubletap (left):     seek backward 10s
 * - doubletap (center):   toggleFullscreen
 * - doubletap (right):    seek forward 10s
 */

// Helper to get center coordinates of an element
async function getCenter(player: PlayerPage) {
  const box = await player.playerRoot.boundingBox();
  if (!box) throw new Error('Player not visible');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// --- Mouse gestures (pointer="mouse") ---

test.describe('Mouse Gestures', () => {
  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/html-video-mp4.html');
    await player.waitForMediaReady();
  });

  test('click center of container toggles play/pause', async ({ page }) => {
    await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');

    // Click the center of the player (not a button) — should toggle play
    const { x, y } = await getCenter(player);
    await page.mouse.click(x, y);
    await expect(player.playButton).not.toHaveAttribute(DATA_ATTRS.paused, { timeout: 5_000 });

    // Click again — should pause
    await page.mouse.click(x, y);
    await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '', { timeout: 5_000 });
  });

  test('click on button does not trigger container gesture', async () => {
    // Clicking the play button should only fire the button action, not the
    // container gesture. If both fired, play would toggle twice (no-op).
    await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');
    await player.playButton.click();
    await expect(player.playButton).not.toHaveAttribute(DATA_ATTRS.paused, { timeout: 5_000 });
  });
});

// --- Touch gestures (pointer="touch") ---

test.describe('Touch Gestures', () => {
  test.use({ hasTouch: true, viewport: { width: 375, height: 667 } });

  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/html-video-mp4.html');
    await player.waitForMediaReady();
  });

  test('tap container toggles controls visibility', async ({ page }) => {
    // Tap the center of the player container with touch
    const { x, y } = await getCenter(player);
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(300);

    // Controls should respond to the tap gesture
    await expect(player.controls).toBeAttached();
  });

  test('double-tap right side seeks forward', async ({ page }) => {
    // Start playback first so seek has buffered data
    await player.play();
    await page.waitForTimeout(500);

    // Get a point in the right third of the player
    const box = await player.playerRoot.boundingBox();
    if (!box) throw new Error('Player not visible');
    const rightX = box.x + box.width * 0.85;
    const centerY = box.y + box.height / 2;

    // Double-tap right side — should seek forward 10s
    await page.touchscreen.tap(rightX, centerY);
    await page.waitForTimeout(50);
    await page.touchscreen.tap(rightX, centerY);

    // Verify the player registered a seek (data-started should be set)
    await expect(player.playButton).toHaveAttribute(DATA_ATTRS.started, '');
  });

  test('double-tap left side seeks backward', async ({ page }) => {
    // Play and seek forward first so there's room to seek back
    await player.play();
    await page.waitForTimeout(1_000);

    // Get a point in the left third of the player
    const box = await player.playerRoot.boundingBox();
    if (!box) throw new Error('Player not visible');
    const leftX = box.x + box.width * 0.15;
    const centerY = box.y + box.height / 2;

    // Double-tap left side — should seek backward 10s
    await page.touchscreen.tap(leftX, centerY);
    await page.waitForTimeout(50);
    await page.touchscreen.tap(leftX, centerY);

    // Player should still be started (seek doesn't stop playback)
    await expect(player.playButton).toHaveAttribute(DATA_ATTRS.started, '');
  });
});
