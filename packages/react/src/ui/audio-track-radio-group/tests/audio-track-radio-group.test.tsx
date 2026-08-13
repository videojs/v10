'use client';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import type { MediaAudioTrack } from '@videojs/media';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../../i18n';
import { createPlayerWrapper } from '../../../testing/mocks';
import { Menu } from '../../menu';
import { AudioTrackRadioGroup, type AudioTrackRadioGroupItemState } from '../audio-track-radio-group';

afterEach(() => {
  resetI18nRegistry();
  cleanup();
});

const defaultAudioTrackList: MediaAudioTrack[] = [
  { id: '0', kind: 'main', label: 'English', language: 'en', enabled: true },
  { id: '1', kind: 'alternative', label: 'Spanish', language: 'es', enabled: false },
];

function renderAudioTrackRadioGroup({
  audioTrackList = defaultAudioTrackList,
  selectAudioTrack = vi.fn(),
  locale,
  group,
}: {
  audioTrackList?: MediaAudioTrack[];
  selectAudioTrack?: (value: string) => void;
  locale?: string;
  group?: React.ReactNode;
} = {}) {
  const { Wrapper } = createPlayerWrapper({ audioTrackList, selectAudioTrack });
  const content = (
    <Menu.Root defaultOpen>
      <Menu.Content>
        {group ?? <AudioTrackRadioGroup renderItem={(props) => <Menu.RadioItem {...props} />} />}
      </Menu.Content>
    </Menu.Root>
  );

  render(locale ? <I18nProvider locale={locale}>{content}</I18nProvider> : content, { wrapper: Wrapper });

  return { selectAudioTrack };
}

describe('AudioTrackRadioGroup', () => {
  it('renders generated radio item props and option state', () => {
    const states: AudioTrackRadioGroupItemState[] = [];
    renderAudioTrackRadioGroup({
      group: (
        <AudioTrackRadioGroup
          renderItem={(props, state) => {
            states.push(state);
            return <Menu.RadioItem {...props} />;
          }}
        />
      ),
    });

    const english = screen.getByRole('menuitemradio', { name: 'English' });
    const spanish = screen.getByRole('menuitemradio', { name: 'Spanish' });

    expect(english.getAttribute('data-track')).toBe('0');
    expect(english.getAttribute('aria-checked')).toBe('true');
    expect(spanish.getAttribute('data-track')).toBe('1');
    expect(spanish.getAttribute('aria-checked')).toBe('false');
    expect(states.slice(-2)).toEqual([
      expect.objectContaining({ value: '0', label: 'English', checked: true }),
      expect.objectContaining({ value: '1', label: 'Spanish', checked: false }),
    ]);
  });

  it('selects an audio track', () => {
    const selectAudioTrack = vi.fn();
    renderAudioTrackRadioGroup({ selectAudioTrack });

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Spanish' }));

    expect(selectAudioTrack).toHaveBeenCalledWith('1');
  });

  it('exposes group state through attributes and callbacks', () => {
    const ref = createRef<HTMLDivElement>();
    renderAudioTrackRadioGroup({
      group: (
        <AudioTrackRadioGroup
          ref={ref}
          data-testid="group"
          className={(state) => `audio-${state.availability}`}
          renderItem={(props) => <Menu.RadioItem {...props} />}
        />
      ),
    });

    const group = screen.getByTestId('group');
    expect(ref.current).toBe(group);
    expect(group.classList.contains('audio-available')).toBe(true);
    expect(group.getAttribute('aria-label')).toBe('Audio');
    expect(group.getAttribute('data-audio-track')).toBe('0');
    expect(group.getAttribute('data-availability')).toBe('available');
    expect(group.hasAttribute('data-disabled')).toBe(false);
    expect(group.hidden).toBe(false);
  });

  it('hides and disables the group when track selection is unavailable', () => {
    renderAudioTrackRadioGroup({ audioTrackList: [defaultAudioTrackList[0]!] });

    const group = document.querySelector<HTMLElement>('[role="group"]');
    expect(group).toBeTruthy();
    expect(group?.hidden).toBe(true);
    expect(group?.getAttribute('aria-disabled')).toBe('true');
    expect(group?.hasAttribute('data-disabled')).toBe(true);
    expect(group?.hasAttribute('data-hidden')).toBe(true);
    expect(group?.getAttribute('data-availability')).toBe('unavailable');
  });

  it('supports custom group and item roots', () => {
    renderAudioTrackRadioGroup({
      group: (
        <AudioTrackRadioGroup
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

    const group = screen.getByRole('group', { name: 'Audio' });
    expect(group.tagName).toBe('SECTION');
    expect(group.getAttribute('data-value')).toBe('0');
    expect(screen.getByRole('menuitemradio', { name: 'English' }).querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: 'Spanish' })).toBeTruthy();
  });

  it('translates the default accessible label', () => {
    registerI18n('xx', { 'menu.audio': 'Audio translated' });
    renderAudioTrackRadioGroup({ locale: 'xx' });

    expect(screen.getByRole('group', { name: 'Audio translated' })).toBeTruthy();
  });

  it('lets explicit labeling override the default label', () => {
    renderAudioTrackRadioGroup({
      group: (
        <>
          <span id="audio-label">Choose audio</span>
          <AudioTrackRadioGroup aria-labelledby="audio-label" renderItem={(props) => <Menu.RadioItem {...props} />} />
        </>
      ),
    });

    const group = screen.getByRole('group', { name: 'Choose audio' });
    expect(group.hasAttribute('aria-label')).toBe(false);
  });
});
