import { describe, expect, it } from 'vitest';

async function waitForUpdates(elements: Element[]): Promise<void> {
  for (const element of elements) {
    const maybeReactive = element as Element & { updateComplete?: Promise<boolean> };
    await maybeReactive.updateComplete;
  }
}

describe('video/ui ejected registration', () => {
  it('updates volume slider child parts when light DOM exists before registration', async () => {
    document.body.innerHTML = /*html*/ `
      <video-player>
        <media-container>
          <video></video>

          <media-time-slider>
            <media-slider-track>
              <media-slider-fill></media-slider-fill>
              <media-slider-buffer></media-slider-buffer>
            </media-slider-track>
            <media-slider-thumb></media-slider-thumb>
          </media-time-slider>

          <media-volume-slider orientation="vertical" thumb-alignment="edge">
            <media-slider-track>
              <media-slider-fill></media-slider-fill>
            </media-slider-track>
            <media-slider-thumb></media-slider-thumb>
          </media-volume-slider>
        </media-container>
      </video-player>
    `;

    await import('../video/ui');

    const volumeSlider = document.querySelector('media-volume-slider')! as HTMLElement & { orientation: string };
    const volumeTrack = volumeSlider.querySelector('media-slider-track')!;
    const volumeFill = volumeSlider.querySelector('media-slider-fill')!;
    const volumeThumb = volumeSlider.querySelector('media-slider-thumb')!;

    volumeSlider.orientation = 'vertical';

    await Promise.resolve();
    await waitForUpdates([volumeSlider, volumeTrack, volumeFill, volumeThumb]);

    expect(volumeSlider.getAttribute('data-orientation')).toBe('vertical');
    expect(volumeTrack.getAttribute('data-orientation')).toBe('vertical');
    expect(volumeFill.getAttribute('data-orientation')).toBe('vertical');
    expect(volumeThumb.getAttribute('data-orientation')).toBe('vertical');
    expect(volumeThumb.getAttribute('aria-orientation')).toBe('vertical');
  });
});
