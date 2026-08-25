import { render } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';

import { VimeoVideo } from '../vimeo-video';

/** Flush the microtask a deferred embed waits on before it is built. */
async function flushDeferredEmbed(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
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
});
