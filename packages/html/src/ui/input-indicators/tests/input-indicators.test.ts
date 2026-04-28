import {
  getVolumeIndicatorDisplayValue,
  type VolumeIndicatorCore,
  VolumeIndicatorCSSVars,
  VolumeIndicatorDataAttrs,
} from '@videojs/core';
import { getIndicatorVisibilityCoordinator } from '@videojs/core/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SeekIndicatorElement } from '../../seek-indicator/seek-indicator-element';
import { SeekIndicatorValueElement } from '../../seek-indicator/seek-indicator-value-element';
import { StatusAnnouncerElement } from '../../status-announcer/status-announcer-element';
import { StatusIndicatorElement } from '../../status-indicator/status-indicator-element';
import { StatusIndicatorValueElement } from '../../status-indicator/status-indicator-value-element';
import { VolumeIndicatorElement } from '../../volume-indicator/volume-indicator-element';
import { VolumeIndicatorFillElement } from '../../volume-indicator/volume-indicator-fill-element';
import { VolumeIndicatorValueElement } from '../../volume-indicator/volume-indicator-value-element';
import { LiveIndicator } from '../live-indicator';

afterEach(() => {
  document.body.replaceChildren();
});

describe('input indicators', () => {
  it('exposes standalone indicator tag names', () => {
    expect(StatusIndicatorElement.tagName).toBe('media-status-indicator');
    expect(StatusIndicatorValueElement.tagName).toBe('media-status-indicator-value');
    expect(StatusAnnouncerElement.tagName).toBe('media-status-announcer');
    expect(VolumeIndicatorElement.tagName).toBe('media-volume-indicator');
    expect(VolumeIndicatorFillElement.tagName).toBe('media-volume-indicator-fill');
    expect(VolumeIndicatorValueElement.tagName).toBe('media-volume-indicator-value');
    expect(SeekIndicatorElement.tagName).toBe('media-seek-indicator');
    expect(SeekIndicatorValueElement.tagName).toBe('media-seek-indicator-value');
  });

  it('uses authored HTML indicators as the mounted visual surface', () => {
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

  it('shares a visibility coordinator per container', () => {
    const container = document.createElement('div');
    const first = { close: vi.fn() };
    const second = { close: vi.fn() };

    const coordinator = getIndicatorVisibilityCoordinator(container);
    coordinator.register(first);
    coordinator.register(second);
    coordinator.show(second);

    expect(getIndicatorVisibilityCoordinator(container)).toBe(coordinator);
    expect(first.close).toHaveBeenCalledOnce();
    expect(second.close).not.toHaveBeenCalled();
  });
});
