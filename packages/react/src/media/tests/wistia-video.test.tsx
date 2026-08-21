import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WistiaVideo } from '../wistia-video';

// Wistia's component renders its web component, which registers itself and reaches for browser APIs the
// test environment has none of. Stubbed down to the props it is handed, recorded for the assertions below.
const lastProps: { current: Record<string, any> } = { current: {} };

vi.mock('@wistia/wistia-player-react', () => ({
  WistiaPlayer: ({ ref, ...props }: Record<string, any>) => {
    lastProps.current = props;
    return <div data-testid="wistia-player" ref={ref} />;
  },
}));

const SRC = 'https://wesleyluyten.wistia.com/medias/oifkgmxnkb';

describe('WistiaVideo', () => {
  it('resolves a Wistia URL to the media id the player wants', () => {
    render(<WistiaVideo src={SRC} />);

    expect(lastProps.current.mediaId).toBe('oifkgmxnkb');
  });

  it('takes the media id straight from a source', () => {
    render(<WistiaVideo source={{ mediaId: 'abcde12345' }} />);

    expect(lastProps.current.mediaId).toBe('abcde12345');
  });

  it("passes Wistia's own options through untouched", () => {
    render(<WistiaVideo source={{ mediaId: 'abcde12345', playerColor: '54bbff', qualityMin: 540 }} />);

    expect(lastProps.current).toMatchObject({ playerColor: '54bbff', qualityMin: 540 });
  });

  it('hides Wistia chrome unless controls are asked for', () => {
    const { rerender } = render(<WistiaVideo src={SRC} />);
    expect(lastProps.current).toMatchObject({ bigPlayButton: false, playBarControl: false });

    rerender(<WistiaVideo src={SRC} controls />);
    expect(lastProps.current).toMatchObject({ bigPlayButton: true, playBarControl: true });
  });

  it('squares the corners Wistia rounds, and lets a source round them back', () => {
    const { rerender } = render(<WistiaVideo src={SRC} />);
    expect(lastProps.current.roundedPlayer).toBe(0);

    rerender(<WistiaVideo src={SRC} source={{ roundedPlayer: 12 }} />);
    expect(lastProps.current.roundedPlayer).toBe(12);
  });

  it('crops itself to the skin’s corners, which Wistia paints child elements past', () => {
    render(<WistiaVideo src={SRC} />);

    expect(lastProps.current.style).toMatchObject({
      borderRadius: 'var(--media-video-border-radius)',
      overflow: 'hidden',
    });
  });

  it('stops a chromeless player taking the pointer events the skin is listening for', () => {
    const { rerender } = render(<WistiaVideo src={SRC} />);
    expect(lastProps.current.style).toMatchObject({ pointerEvents: 'none' });

    rerender(<WistiaVideo src={SRC} controls />);
    expect(lastProps.current.style).toMatchObject({ pointerEvents: 'auto' });
  });

  it('merges a style of its own rather than replacing the consumer’s', () => {
    render(<WistiaVideo src={SRC} style={{ borderRadius: 8 }} />);

    expect(lastProps.current.style).toMatchObject({ borderRadius: 8, pointerEvents: 'none' });
  });

  it('spells loop the way Wistia does', () => {
    render(<WistiaVideo src={SRC} loop />);

    expect(lastProps.current.endVideoBehavior).toBe('loop');
  });

  it('sends defaultMuted as the muted state the player starts in', () => {
    render(<WistiaVideo src={SRC} defaultMuted />);

    expect(lastProps.current.muted).toBe(true);
  });

  it('resolves an empty preload, which Wistia does not accept', () => {
    render(<WistiaVideo src={SRC} preload="" />);

    expect(lastProps.current.preload).toBe('metadata');
  });

  it('keeps playsInline to itself, since Wistia plays inline and has no knob for it', () => {
    render(<WistiaVideo src={SRC} playsInline />);

    expect(lastProps.current).not.toHaveProperty('playsInline');
  });

  it('passes unknown props through to the player', () => {
    render(<WistiaVideo src={SRC} className="block w-full h-full" />);

    expect(lastProps.current.className).toBe('block w-full h-full');
  });
});
