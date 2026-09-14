import { render } from '@testing-library/react';
import { VimeoAdapter } from '@videojs/vimeo-video';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';

import { VimeoVideo } from '../vimeo-video';

/** Flush the microtask a deferred embed waits on before it is built. */
async function flushDeferredEmbed(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

/** Render and capture the media instance the component attached its iframe to. */
function renderWithMedia(ui: ReactElement) {
  const attach = vi.spyOn(VimeoAdapter.prototype, 'attach');
  const result = render(ui);
  const media = attach.mock.contexts[0] as VimeoAdapter;

  attach.mockRestore();
  return { ...result, media };
}

describe('VimeoVideo', () => {
  it('builds the embed from the src prop', () => {
    const { container } = render(<VimeoVideo src="https://vimeo.com/1181503036" />);

    expect(container.querySelector('iframe')!.getAttribute('src')).toContain(
      'https://player.vimeo.com/video/1181503036'
    );
  });

  it('renders without a source and builds the embed when one arrives', async () => {
    // The iframe has no embed to point the player at until a source resolves.
    const { container, rerender } = render(<VimeoVideo />);
    const iframe = container.querySelector('iframe')!;

    expect(iframe.getAttribute('src')).toBe(null);

    rerender(<VimeoVideo src="https://vimeo.com/1181503036" />);
    await flushDeferredEmbed();

    expect(iframe.getAttribute('src')).toContain('https://player.vimeo.com/video/1181503036');
  });

  it('routes media event props to the media rather than the iframe', () => {
    const onPlay = vi.fn((event: Event) => event.currentTarget);
    const onTimeUpdate = vi.fn();
    const { container, media } = renderWithMedia(
      <VimeoVideo src="https://vimeo.com/1181503036" onPlay={onPlay} onTimeUpdate={onTimeUpdate} />
    );

    media.dispatchEvent(new Event('play'));
    media.dispatchEvent(new Event('timeupdate'));

    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveReturnedWith(media);
    expect(onTimeUpdate).toHaveBeenCalledTimes(1);
    expect(container.querySelector('iframe')!.hasAttribute('onplay')).toBe(false);
  });

  it('delivers the loadstart the media dispatches while attaching', () => {
    const onLoadStart = vi.fn();

    render(<VimeoVideo src="https://vimeo.com/1181503036" onLoadStart={onLoadStart} />);

    expect(onLoadStart).toHaveBeenCalledTimes(1);
  });
});
