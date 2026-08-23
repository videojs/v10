import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { I18nProvider } from '../../../i18n';
import { createPlayerWrapper } from '../../../testing/mocks';
import { Menu } from '../../menu';
import { PlaybackRateRadioGroup, type PlaybackRateRadioGroupItemState } from '../playback-rate-radio-group';

afterEach(() => {
  resetI18nRegistry();
  cleanup();
});

function renderPlaybackRateRadioGroup({
  playbackRates = [0.5, 1, 1.5, 2],
  playbackRate = 1.5,
  setPlaybackRate = vi.fn(),
  locale,
  group,
}: {
  playbackRates?: readonly number[];
  playbackRate?: number;
  setPlaybackRate?: (rate: number) => void;
  locale?: string;
  group?: React.ReactNode;
} = {}) {
  const { Wrapper } = createPlayerWrapper({ playbackRates, playbackRate, setPlaybackRate });
  const content = (
    <Menu.Root defaultOpen>
      <Menu.Popup>
        <Menu.Content>
          {group ?? <PlaybackRateRadioGroup renderItem={(props) => <Menu.RadioItem {...props} />} />}
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );

  render(locale ? <I18nProvider locale={locale}>{content}</I18nProvider> : content, { wrapper: Wrapper });

  return { setPlaybackRate };
}

describe('PlaybackRateRadioGroup', () => {
  it('renders generated radio item props and item state', () => {
    const states: PlaybackRateRadioGroupItemState[] = [];

    renderPlaybackRateRadioGroup({
      group: (
        <PlaybackRateRadioGroup
          renderItem={(props, state) => {
            states.push(state);
            return <Menu.RadioItem {...props} />;
          }}
        />
      ),
    });

    expect(screen.getByRole('menuitemradio', { name: '1.5×' }).getAttribute('data-rate')).toBe('1.5');
    expect(screen.getByRole('menuitemradio', { name: '1.5×' }).getAttribute('aria-checked')).toBe('true');
    expect(states.slice(-4)).toEqual([
      expect.objectContaining({ rate: 0.5, value: '0.5', checked: false }),
      expect.objectContaining({ rate: 1, value: '1', checked: false }),
      expect.objectContaining({ rate: 1.5, value: '1.5', checked: true }),
      expect.objectContaining({ rate: 2, value: '2', checked: false }),
    ]);
  });

  it('sets the playback rate', () => {
    const setPlaybackRate = vi.fn();

    renderPlaybackRateRadioGroup({ setPlaybackRate });

    fireEvent.click(screen.getByRole('menuitemradio', { name: '2×' }));

    expect(setPlaybackRate).toHaveBeenCalledWith(2);
  });

  it('exposes group state through attributes and callbacks', () => {
    const ref = createRef<HTMLDivElement>();

    renderPlaybackRateRadioGroup({
      group: (
        <PlaybackRateRadioGroup
          ref={ref}
          data-testid="group"
          className={(state) => `rate-${state.availability}`}
          renderItem={(props) => <Menu.RadioItem {...props} />}
        />
      ),
    });

    const group = screen.getByTestId('group');

    expect(ref.current).toBe(group);
    expect(group.classList.contains('rate-available')).toBe(true);
    expect(group.getAttribute('aria-label')).toBe('Playback rate');
    expect(group.getAttribute('data-rate')).toBe('1.5');
    expect(group.getAttribute('data-availability')).toBe('available');
  });

  it('hides and disables the group when playback rates are unavailable', () => {
    renderPlaybackRateRadioGroup({ playbackRates: [] });

    const group = document.querySelector<HTMLElement>('[role="group"]');

    expect(group).toBeTruthy();
    expect(group?.hidden).toBe(true);
    expect(group?.getAttribute('aria-disabled')).toBe('true');
    expect(group?.hasAttribute('data-disabled')).toBe(true);
    expect(group?.hasAttribute('data-hidden')).toBe(true);
  });

  it('supports custom group and item roots', () => {
    renderPlaybackRateRadioGroup({
      group: (
        <PlaybackRateRadioGroup
          render={(props, state) => <section {...props} data-value={state.value} />}
          renderItem={(props, state) => (
            <Menu.RadioItem {...props}>
              <span>{state.label}</span>
              <Menu.ItemIndicator checked={state.checked}>✓</Menu.ItemIndicator>
            </Menu.RadioItem>
          )}
        />
      ),
    });

    const group = screen.getByRole('group', { name: 'Playback rate' });

    expect(group.tagName).toBe('SECTION');
    expect(group.getAttribute('data-value')).toBe('1.5');
    expect(screen.getByRole('menuitemradio', { name: '1.5×' }).querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('translates the default accessible label', () => {
    registerI18n('xx', { 'menu.playbackRate': 'Translated playback rate' });
    renderPlaybackRateRadioGroup({ locale: 'xx' });

    expect(screen.getByRole('group', { name: 'Translated playback rate' })).toBeTruthy();
  });
});
