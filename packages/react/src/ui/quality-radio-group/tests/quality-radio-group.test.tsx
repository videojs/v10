import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import type { MediaVideoRendition } from '@videojs/media';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { I18nProvider } from '../../../i18n';
import { createPlayerWrapper } from '../../../testing/mocks';
import { Menu } from '../../menu';
import { QualityRadioGroup, type QualityRadioGroupItemState } from '../quality-radio-group';

afterEach(() => {
  resetI18nRegistry();
  cleanup();
});

const defaultVideoRenditionList: MediaVideoRendition[] = [
  { id: '0', height: 1080, selected: false },
  { id: '1', height: 720, selected: false },
];

function renderQualityRadioGroup({
  videoRenditionList = defaultVideoRenditionList,
  activeVideoRendition = null,
  selectVideoRendition = vi.fn(),
  locale,
  group,
}: {
  videoRenditionList?: MediaVideoRendition[];
  activeVideoRendition?: MediaVideoRendition | null;
  selectVideoRendition?: (value: string) => void;
  locale?: string;
  group?: React.ReactNode;
} = {}) {
  const { Wrapper } = createPlayerWrapper({ videoRenditionList, activeVideoRendition, selectVideoRendition });
  const content = (
    <Menu.Root defaultOpen>
      <Menu.Popup>
        <Menu.Content>
          {group ?? <QualityRadioGroup renderItem={(props) => <Menu.RadioItem {...props} />} />}
        </Menu.Content>
      </Menu.Popup>
    </Menu.Root>
  );

  render(locale ? <I18nProvider locale={locale}>{content}</I18nProvider> : content, { wrapper: Wrapper });

  return { selectVideoRendition };
}

describe('QualityRadioGroup', () => {
  it('renders generated radio item props and item state', () => {
    const states: QualityRadioGroupItemState[] = [];

    renderQualityRadioGroup({
      group: (
        <QualityRadioGroup
          renderItem={(props, state) => {
            states.push(state);
            return (
              <Menu.RadioItem {...props}>{state.tier ? `${state.label} ${state.tier}` : state.label}</Menu.RadioItem>
            );
          }}
        />
      ),
    });

    expect(screen.getByRole('menuitemradio', { name: 'Auto' }).getAttribute('data-rendition')).toBe('auto');
    expect(screen.getByRole('menuitemradio', { name: 'Auto' }).getAttribute('aria-checked')).toBe('true');
    expect(states.slice(-3)).toEqual([
      expect.objectContaining({ value: 'auto', label: 'Auto', checked: true }),
      expect.objectContaining({ value: '0', label: '1080p', tier: 'HD', checked: false }),
      expect.objectContaining({ value: '1', label: '720p', checked: false }),
    ]);
  });

  it('selects a video rendition', () => {
    const selectVideoRendition = vi.fn();

    renderQualityRadioGroup({ selectVideoRendition });

    fireEvent.click(screen.getByRole('menuitemradio', { name: '720p' }));

    expect(selectVideoRendition).toHaveBeenCalledWith('1');
  });

  it('exposes group state through attributes and callbacks', () => {
    const ref = createRef<HTMLDivElement>();

    renderQualityRadioGroup({
      group: (
        <QualityRadioGroup
          ref={ref}
          data-testid="group"
          className={(state) => `quality-${state.availability}`}
          renderItem={(props) => <Menu.RadioItem {...props} />}
        />
      ),
    });

    const group = screen.getByTestId('group');

    expect(ref.current).toBe(group);
    expect(group.classList.contains('quality-available')).toBe(true);
    expect(group.getAttribute('aria-label')).toBe('Quality');
    expect(group.getAttribute('data-quality')).toBe('auto');
    expect(group.getAttribute('data-availability')).toBe('available');
  });

  it('hides and disables the group when quality selection is unavailable', () => {
    renderQualityRadioGroup({ videoRenditionList: [defaultVideoRenditionList[0]!] });

    const group = document.querySelector<HTMLElement>('[role="group"]');

    expect(group).toBeTruthy();
    expect(group?.hidden).toBe(true);
    expect(group?.getAttribute('aria-disabled')).toBe('true');
    expect(group?.hasAttribute('data-disabled')).toBe(true);
    expect(group?.hasAttribute('data-hidden')).toBe(true);
  });

  it('supports custom group and item roots', () => {
    renderQualityRadioGroup({
      group: (
        <QualityRadioGroup
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

    const group = screen.getByRole('group', { name: 'Quality' });

    expect(group.tagName).toBe('SECTION');
    expect(group.getAttribute('data-value')).toBe('auto');
    expect(screen.getByRole('menuitemradio', { name: 'Auto' }).querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('translates the default accessible label', () => {
    registerI18n('xx', { 'menu.quality': 'Quality translated' });
    renderQualityRadioGroup({ locale: 'xx' });

    expect(screen.getByRole('group', { name: 'Quality translated' })).toBeTruthy();
  });
});
