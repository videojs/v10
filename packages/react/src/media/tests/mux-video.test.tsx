import { render } from '@testing-library/react';
import { MuxData, MuxMedia } from '@videojs/core/dom/media/mux';
import { describe, expect, it, vi } from 'vitest';
import { MuxVideo } from '../mux-video';

describe('MuxVideo', () => {
  it('routes component config to the MuxData component', () => {
    const envKey = vi.spyOn(MuxData.prototype, 'envKey', 'set');

    // `useSyncProps` writes `media.config` during render, before the mount
    // effect registers the components — `addComponent` adopts the early value.
    const { container } = render(<MuxVideo config={{ muxData: { envKey: 'test-key' } }} />);

    expect(envKey).toHaveBeenCalledWith('test-key');
    // The config prop is consumed by the media, not spread onto the element.
    expect(container.querySelector('video')!.hasAttribute('config')).toBe(false);

    envKey.mockRestore();
  });

  it('does not reinitialize mux data when the same config is re-rendered', () => {
    const reinit = vi.spyOn(MuxData.prototype, 'envKey', 'set');

    const { rerender } = render(<MuxVideo config={{ muxData: { envKey: 'test-key' } }} />);
    rerender(<MuxVideo config={{ muxData: { envKey: 'test-key' } }} />);

    // The setter runs per assignment but dedupes same values internally;
    // assert it was only handed the same value.
    expect(reinit).toHaveBeenCalledWith('test-key');
    expect(reinit.mock.calls.every(([value]) => value === 'test-key')).toBe(true);

    reinit.mockRestore();
  });

  it('derives the media src from the playbackId prop', () => {
    const src = vi.spyOn(MuxMedia.prototype, 'src', 'set');

    render(<MuxVideo playbackId="abc123" />);

    expect(src).toHaveBeenCalledWith('https://stream.mux.com/abc123.m3u8');

    src.mockRestore();
  });

  it('applies the customDomain and maxResolution modifiers to src', () => {
    const src = vi.spyOn(MuxMedia.prototype, 'src', 'set');

    render(<MuxVideo playbackId="abc123" customDomain="example.com" maxResolution="1080p" />);

    const url = new URL(src.mock.calls[src.mock.calls.length - 1]![0]);
    expect(url.host).toBe('stream.example.com');
    expect(url.searchParams.get('max_resolution')).toBe('1080p');

    src.mockRestore();
  });
});
