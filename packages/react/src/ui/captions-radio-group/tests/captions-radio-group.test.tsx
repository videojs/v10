import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { I18nProvider } from '../../../i18n';
import { createPlayerWrapper } from '../../../testing/mocks';
import { Menu } from '../../menu';
import { CaptionsRadioGroup, type CaptionsRadioGroupItemState } from '../captions-radio-group';

afterEach(() => {
  resetI18nRegistry();
  cleanup();
});

const defaultTextTrackList = [
  { kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' },
  { kind: 'subtitles', label: 'Spanish', language: 'es', mode: 'showing' },
] as const;

function renderCaptionsRadioGroup({
  textTrackList = defaultTextTrackList,
  subtitlesShowing = true,
  selectSubtitlesTrack = vi.fn(),
  locale,
  group,
}: {
  textTrackList?: readonly { kind: string; label: string; language: string; mode: string }[];
  subtitlesShowing?: boolean;
  selectSubtitlesTrack?: (value: string) => void;
  locale?: string;
  group?: React.ReactNode;
} = {}) {
  const { Wrapper } = createPlayerWrapper({
    textTrackList,
    subtitlesShowing,
    selectSubtitlesTrack,
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
    thumbnailTrackCrossOrigin: null,
    toggleSubtitles: vi.fn(),
  });
  const content = (
    <Menu.Root defaultOpen>
      <Menu.Popup>
        <Menu.Content>
          {group ?? <CaptionsRadioGroup renderItem={(props) => <Menu.RadioItem {...props} />} />}
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );

  render(locale ? <I18nProvider locale={locale}>{content}</I18nProvider> : content, { wrapper: Wrapper });

  return { selectSubtitlesTrack };
}

describe('CaptionsRadioGroup', () => {
  it('renders generated radio item props and item state', () => {
    const states: CaptionsRadioGroupItemState[] = [];

    renderCaptionsRadioGroup({
      group: (
        <CaptionsRadioGroup
          renderItem={(props, state) => {
            states.push(state);
            return <Menu.RadioItem {...props} />;
          }}
        />
      ),
    });

    expect(screen.getByRole('menuitemradio', { name: 'Off' }).getAttribute('data-track')).toBe('off');
    expect(screen.getByRole('menuitemradio', { name: 'Spanish' }).getAttribute('aria-checked')).toBe('true');
    expect(states.slice(-3)).toEqual([
      expect.objectContaining({ value: 'off', label: 'Off', checked: false }),
      expect.objectContaining({ value: '0', label: 'English', checked: false }),
      expect.objectContaining({ value: '1', label: 'Spanish', checked: true }),
    ]);
  });

  it('selects a captions track', () => {
    const selectSubtitlesTrack = vi.fn();

    renderCaptionsRadioGroup({ selectSubtitlesTrack });

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));

    expect(selectSubtitlesTrack).toHaveBeenCalledWith('0');
  });

  it('exposes group state through attributes and callbacks', () => {
    const ref = createRef<HTMLDivElement>();

    renderCaptionsRadioGroup({
      group: (
        <CaptionsRadioGroup
          ref={ref}
          data-testid="group"
          className={(state) => `captions-${state.availability}`}
          renderItem={(props) => <Menu.RadioItem {...props} />}
        />
      ),
    });

    const group = screen.getByTestId('group');

    expect(ref.current).toBe(group);
    expect(group.classList.contains('captions-available')).toBe(true);
    expect(group.getAttribute('aria-label')).toBe('Captions');
    expect(group.hasAttribute('data-active')).toBe(true);
    expect(group.getAttribute('data-availability')).toBe('available');
  });

  it('hides and disables the group when captions are unavailable', () => {
    renderCaptionsRadioGroup({ textTrackList: [], subtitlesShowing: false });

    const group = document.querySelector<HTMLElement>('[role="group"]');

    expect(group).toBeTruthy();
    expect(group?.hidden).toBe(true);
    expect(group?.getAttribute('aria-disabled')).toBe('true');
    expect(group?.hasAttribute('data-disabled')).toBe(true);
    expect(group?.hasAttribute('data-hidden')).toBe(true);
  });

  it('supports custom group and item roots', () => {
    renderCaptionsRadioGroup({
      group: (
        <CaptionsRadioGroup
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

    const group = screen.getByRole('group', { name: 'Captions' });

    expect(group.tagName).toBe('SECTION');
    expect(group.getAttribute('data-value')).toBe('1');
    expect(screen.getByRole('menuitemradio', { name: 'Spanish' }).querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('translates the default accessible label', () => {
    registerI18n('xx', { 'menu.captions': 'Translated captions' });
    renderCaptionsRadioGroup({ locale: 'xx' });

    expect(screen.getByRole('group', { name: 'Translated captions' })).toBeTruthy();
  });
});
