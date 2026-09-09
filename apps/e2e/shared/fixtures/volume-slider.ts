import type { Locator, Page } from '@playwright/test';

interface VolumeKeyResult {
  beforeRelease: number;
  frames: number[];
  gaps: number[];
  release: number[];
}

function getThumbPercent(slider: Locator): Promise<number> {
  return slider.evaluate((element) => {
    const thumb = element.querySelector<HTMLElement>('.media-slider__thumb, media-slider-thumb, [role="slider"]')!;
    const sliderRect = element.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();

    return 100 - ((thumbRect.top + thumbRect.height / 2 - sliderRect.top) / sliderRect.height) * 100;
  });
}

export async function holdVolumeKey(
  page: Page,
  slider: Locator,
  key: 'ArrowDown' | 'ArrowUp'
): Promise<VolumeKeyResult> {
  await slider.evaluate((element) => {
    const frames: number[] = [];
    const gaps: number[] = [];
    const record = () => {
      const thumb = element.querySelector<HTMLElement>('.media-slider__thumb, media-slider-thumb, [role="slider"]')!;
      const sliderRect = element.getBoundingClientRect();
      const thumbRect = thumb.getBoundingClientRect();

      frames.push(100 - ((thumbRect.top + thumbRect.height / 2 - sliderRect.top) / sliderRect.height) * 100);
      gaps.push(Math.min(thumbRect.top - sliderRect.top, sliderRect.bottom - thumbRect.bottom));
      window.volumeSliderFrame = requestAnimationFrame(record);
    };

    window.volumeSliderFrames = frames;
    window.volumeSliderGaps = gaps;
    record();
  });

  await page.keyboard.down(key);
  await page.waitForTimeout(500);

  for (let i = 1; i < 24; i++) {
    await page.keyboard.down(key);
    await page.waitForTimeout(17);
  }

  const beforeRelease = await getThumbPercent(slider);

  await page.keyboard.up(key);
  const release: number[] = [];

  for (const wait of [0, 16, 100]) {
    await page.waitForTimeout(wait);
    release.push(await getThumbPercent(slider));
  }

  const { frames, gaps } = await page.evaluate(() => {
    cancelAnimationFrame(window.volumeSliderFrame);

    return {
      frames: window.volumeSliderFrames,
      gaps: window.volumeSliderGaps,
    };
  });

  return { beforeRelease, frames, gaps, release };
}

export function neverReverses(values: number[], direction: 'down' | 'up'): boolean {
  const sign = direction === 'up' ? 1 : -1;

  return values.slice(1).every((value, index) => (value - values[index]!) * sign >= -0.01);
}

export function stays(values: number[], expected: number): boolean {
  return values.every((value) => Math.abs(value - expected) < 0.01);
}

declare global {
  interface Window {
    volumeSliderFrame: number;
    volumeSliderFrames: number[];
    volumeSliderGaps: number[];
  }
}
