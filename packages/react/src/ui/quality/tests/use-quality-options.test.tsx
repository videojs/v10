'use client';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MediaVideoRendition } from '@videojs/core';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { Menu } from '../../menu';
import { useQualityOptions } from '../use-quality-options';

afterEach(cleanup);

function renderQualityOptions({
  videoRenditionList = [
    { id: '0', height: 1080, selected: false },
    { id: '1', height: 720, selected: false },
  ],
  activeVideoRendition = null,
  selectVideoRendition = vi.fn(),
  formatRendition,
}: {
  videoRenditionList?: MediaVideoRendition[];
  activeVideoRendition?: MediaVideoRendition | null | undefined;
  selectVideoRendition?: (value: string) => void;
  formatRendition?: ((rendition: MediaVideoRendition) => string) | undefined;
} = {}) {
  const { Wrapper } = createPlayerWrapper({ videoRenditionList, activeVideoRendition, selectVideoRendition });

  render(
    <Menu.Root defaultOpen align="center">
      <Menu.Content data-testid="content">
        <QualityRadioGroup formatRendition={formatRendition} />
      </Menu.Content>
    </Menu.Root>,
    { wrapper: Wrapper }
  );

  return { selectVideoRendition };
}

function QualityRadioGroup({
  formatRendition,
}: {
  formatRendition?: ((rendition: MediaVideoRendition) => string) | undefined;
}): ReactNode {
  const quality = useQualityOptions(formatRendition ? { formatRendition } : undefined);
  if (!quality) return null;

  const { options, setValue, value } = quality;

  return (
    <Menu.RadioGroup value={value} onValueChange={setValue} aria-label="Quality">
      {options.map((option) => (
        <Menu.RadioItem key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
          {option.tier ? <sup>{option.tier}</sup> : null}
          {option.badge ? <span>{option.badge}</span> : null}
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  );
}

describe('useQualityOptions', () => {
  it('renders Auto and rendition options', () => {
    renderQualityOptions();

    expect(screen.getByRole('menuitemradio', { name: 'Auto' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('menuitemradio', { name: '1080p HD' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('menuitemradio', { name: '720p' }).getAttribute('aria-checked')).toBe('false');
  });

  it('sets the selected rendition', () => {
    const selectVideoRendition = vi.fn();
    renderQualityOptions({ selectVideoRendition });

    fireEvent.click(screen.getByRole('menuitemradio', { name: '720p' }));

    expect(selectVideoRendition).toHaveBeenCalledWith('1');
  });

  it('renders the active rendition in the Auto option', () => {
    renderQualityOptions({
      activeVideoRendition: { id: '1', height: 720, selected: false },
    });

    expect(screen.getByRole('menuitemradio', { name: 'Auto (720p)' }).getAttribute('aria-checked')).toBe('true');
  });

  it('uses a custom rendition formatter', () => {
    renderQualityOptions({
      formatRendition: (rendition) => `${rendition.height} pixels`,
    });

    expect(screen.getByRole('menuitemradio', { name: '1080 pixels' })).toBeTruthy();
  });

  it('renders bitrate badges for duplicate resolutions', () => {
    renderQualityOptions({
      videoRenditionList: [
        { id: '0', height: 1080, bitrate: 6_000_000, selected: false },
        { id: '1', height: 1080, bitrate: 3_000_000, selected: false },
        { id: '2', height: 720, bitrate: 1_500_000, selected: false },
      ],
    });

    expect(screen.getByRole('menuitemradio', { name: '1080p HD 6 Mbps' })).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: '1080p HD 3 Mbps' })).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: '720p' })).toBeTruthy();
  });

  it('renders superscript labels for high-resolution renditions', () => {
    renderQualityOptions({
      videoRenditionList: [
        { id: '0', height: 1080, selected: false },
        { id: '1', height: 2160, selected: false },
        { id: '2', height: 4320, selected: false },
      ],
    });

    expect(screen.getByRole('menuitemradio', { name: '1080p HD' })).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: '2160p 4K' })).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: '4320p 8K' })).toBeTruthy();
  });

  it('disables options when only one rendition is available', () => {
    renderQualityOptions({
      videoRenditionList: [{ id: '0', height: 1080, selected: false }],
    });

    expect(screen.getByRole('menuitemradio', { name: 'Auto' }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('menuitemradio', { name: '1080p HD' }).getAttribute('aria-disabled')).toBe('true');
  });
});
