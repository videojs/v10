import {
  getVolumeIndicatorDisplayValue,
  type VolumeIndicatorCore,
  VolumeIndicatorCSSVars,
  VolumeIndicatorDataAttrs,
} from '@videojs/core';
import { afterEach, describe, expect, it } from 'vitest';
import { LiveIndicator } from '../live-indicator';

afterEach(() => {
  document.body.replaceChildren();
});

describe('LiveIndicator', () => {
  it('uses authored HTML as the mounted visual surface', () => {
    const host = document.createElement('media-volume-indicator');
    host.hidden = true;
    host.innerHTML = `
      <media-volume-indicator-fill>
        <media-volume-indicator-value></media-volume-indicator-value>
      </media-volume-indicator-fill>
    `;
    document.body.append(host);

    const indicator = new LiveIndicator<VolumeIndicatorCore.State>({
      host,
      dataAttrs: VolumeIndicatorDataAttrs,
      render: (element, state) => {
        element
          .querySelector<HTMLElement>('media-volume-indicator-fill')
          ?.style.setProperty(VolumeIndicatorCSSVars.fill, state.fill ?? '');
        const value = element.querySelector('media-volume-indicator-value');
        if (value) value.textContent = getVolumeIndicatorDisplayValue(state);
      },
    });

    const liveElement = indicator.render({
      open: true,
      generation: 1,
      level: 'high',
      value: '60%',
      fill: '60%',
      min: false,
      max: false,
      transitionStarting: true,
      transitionEnding: false,
    });

    expect(liveElement).toBe(host);
    expect(host.hidden).toBe(false);
    expect(document.body.querySelectorAll('media-volume-indicator')).toHaveLength(1);
    expect(liveElement.getAttribute('data-level')).toBe('high');
    expect(liveElement.querySelector('media-volume-indicator-value')?.textContent).toBe('60%');
    expect(
      liveElement
        .querySelector<HTMLElement>('media-volume-indicator-fill')
        ?.style.getPropertyValue(VolumeIndicatorCSSVars.fill)
    ).toBe('60%');

    indicator.remove();
    expect(host.hidden).toBe(true);
    expect(document.body.querySelectorAll('media-volume-indicator')).toHaveLength(1);
    expect(host.hasAttribute('data-open')).toBe(false);
    expect(host.hasAttribute('data-level')).toBe(false);
  });
});
