import { render } from '@testing-library/react';
import type { Media } from '@videojs/media';
import { addMediaComponent, getMediaComponents } from '@videojs/media/dom/media-host';
import { MuxData as MuxDataComponent, MuxMedia } from '@videojs/media/dom/mux';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createPlayerWrapper } from '../../testing/mocks';
import { MuxData } from '../mux-data';

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {}

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

function setup() {
  const media = new MuxMedia();
  const { value, Wrapper } = createPlayerWrapper();
  value.media = media as unknown as Media;
  return { media, Wrapper };
}

describe('MuxData', () => {
  it('registers a MuxData component with the media from context', () => {
    const { media, Wrapper } = setup();

    render(<MuxData />, { wrapper: Wrapper });

    expect(getMediaComponents(media).get(MuxDataComponent)).toBeInstanceOf(MuxDataComponent);
  });

  it('syncs props to the component', () => {
    const { media, Wrapper } = setup();

    render(<MuxData envKey="test-key" playerSoftwareName="mux-video" disableCookies />, { wrapper: Wrapper });

    const component = getMediaComponents(media).get(MuxDataComponent)!;
    expect(component.envKey).toBe('test-key');
    expect(component.playerSoftwareName).toBe('mux-video');
    expect(component.disableCookies).toBe(true);
  });

  it('disables monitoring when MuxDataSdk is explicitly undefined', () => {
    const { media, Wrapper } = setup();
    const MuxDataSdk = {
      monitor: vi.fn(),
      utils: { now: () => 0 },
    } as unknown as NonNullable<MuxDataComponent['MuxDataSdk']>;

    const { rerender } = render(<MuxData MuxDataSdk={MuxDataSdk} />, { wrapper: Wrapper });
    const component = getMediaComponents(media).get(MuxDataComponent)!;
    expect(component.MuxDataSdk).toBe(MuxDataSdk);

    rerender(<MuxData MuxDataSdk={undefined} />);
    expect(component.MuxDataSdk).toBeUndefined();

    rerender(<MuxData />);
    expect(component.MuxDataSdk).toBeDefined();
  });

  it('does not apply MuxDataSdk from an abandoned render', () => {
    const { media, Wrapper } = setup();
    const committedSdk = {
      monitor: vi.fn(),
      utils: { now: () => 0 },
    } as unknown as NonNullable<MuxDataComponent['MuxDataSdk']>;
    const abandonedSdk = {
      monitor: vi.fn(),
      utils: { now: () => 1 },
    } as unknown as NonNullable<MuxDataComponent['MuxDataSdk']>;

    function Throw({ fail = false }: { fail?: boolean }) {
      if (fail) throw new Error('abandon render');
      return null;
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <Boundary>
        <Wrapper>
          <MuxData MuxDataSdk={committedSdk} />
          <Throw />
        </Wrapper>
      </Boundary>
    );
    const component = getMediaComponents(media).get(MuxDataComponent)!;

    rerender(
      <Boundary>
        <Wrapper>
          <MuxData MuxDataSdk={abandonedSdk} />
          <Throw fail />
        </Wrapper>
      </Boundary>
    );

    expect(component.MuxDataSdk).toBe(committedSdk);
    consoleError.mockRestore();
  });

  it('resets a removed prop to its default', () => {
    const { media, Wrapper } = setup();

    const { rerender } = render(<MuxData disableCookies />, { wrapper: Wrapper });
    rerender(<MuxData />);

    expect(getMediaComponents(media).get(MuxDataComponent)!.disableCookies).toBe(false);
  });

  it('keeps the component alive when the media host is destroyed while mounted', () => {
    const { media, Wrapper } = setup();
    const destroy = vi.spyOn(MuxDataComponent.prototype, 'destroy');

    render(<MuxData />, { wrapper: Wrapper });
    const component = getMediaComponents(media).get(MuxDataComponent)!;

    media.destroy();

    // The host detaches and unregisters components it doesn't own; this one is
    // owned by the still-mounted `MuxData` and follows the next media.
    expect(destroy).not.toHaveBeenCalled();
    expect(getMediaComponents(media).get(MuxDataComponent)).toBeUndefined();

    const next = new MuxMedia();
    addMediaComponent(next, component);
    expect(getMediaComponents(next).get(MuxDataComponent)).toBe(component);

    destroy.mockRestore();
  });

  it('removes the component on unmount', () => {
    const { media, Wrapper } = setup();

    const { unmount } = render(<MuxData />, { wrapper: Wrapper });
    unmount();

    expect(getMediaComponents(media).get(MuxDataComponent)).toBeUndefined();
  });
});
