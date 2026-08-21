import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WistiaVideo } from '../wistia-video';

// The real package is the player: connecting one reaches for Wistia's CDN and runs an embed. Stubbed down
// to an element that registers under the same tag, which is all this component asks of it — it renders
// `<wistia-player>` and writes attributes, and none of that needs a player behind it.
//
// `@videojs/media` is what depends on the package; this one names it only so this line can resolve, which
// is why it is a devDependency here and nothing imports it outside these tests.
vi.mock('@wistia/wistia-player', () => {
  class WistiaPlayer extends HTMLElement {
    static observedAttributes: string[] = [];
  }
  customElements.define('wistia-player', WistiaPlayer);
  return { WistiaPlayer };
});

const SRC = 'https://wesleyluyten.wistia.com/medias/oifkgmxnkb';

function renderPlayer(ui: React.ReactElement): HTMLElement {
  const { container } = render(ui);
  const player = container.querySelector('wistia-player');
  if (!player) throw new Error('no <wistia-player> rendered');
  return player as HTMLElement;
}

describe('WistiaVideo', () => {
  it('resolves a Wistia URL to the media id the player wants', () => {
    expect(renderPlayer(<WistiaVideo src={SRC} />).getAttribute('media-id')).toBe('oifkgmxnkb');
  });

  it('takes the media id straight from a source', () => {
    expect(renderPlayer(<WistiaVideo source={{ mediaId: 'abcde12345' }} />).getAttribute('media-id')).toBe(
      'abcde12345'
    );
  });

  it("passes Wistia's own options through untouched, spelled the way its element observes them", () => {
    const player = renderPlayer(
      <WistiaVideo source={{ mediaId: 'abcde12345', playerColor: '54bbff', qualityMin: 540 }} />
    );

    expect(player.getAttribute('player-color')).toBe('54bbff');
    expect(player.getAttribute('quality-min')).toBe('540');
  });

  it('hides Wistia chrome unless controls are asked for', () => {
    const { rerender, container } = render(<WistiaVideo src={SRC} />);
    const player = container.querySelector('wistia-player') as HTMLElement;
    // Spelled out rather than dropped: an absent attribute is Wistia's default, which is chrome.
    expect(player.getAttribute('big-play-button')).toBe('false');
    expect(player.getAttribute('play-bar-control')).toBe('false');

    rerender(<WistiaVideo src={SRC} controls />);

    expect(player.getAttribute('big-play-button')).toBe('true');
    expect(player.getAttribute('play-bar-control')).toBe('true');
  });

  it('squares the corners Wistia rounds, and lets a source round them back', () => {
    expect(renderPlayer(<WistiaVideo src={SRC} />).getAttribute('rounded-player')).toBe('0');
    expect(renderPlayer(<WistiaVideo src={SRC} source={{ roundedPlayer: 12 }} />).getAttribute('rounded-player')).toBe(
      '12'
    );
  });

  it('crops itself to the skin’s corners, which Wistia paints child elements past', () => {
    const { style } = renderPlayer(<WistiaVideo src={SRC} />);

    expect(style.borderRadius).toBe('var(--media-video-border-radius)');
    expect(style.overflow).toBe('hidden');
  });

  it('stops a chromeless player taking the pointer events the skin is listening for', () => {
    expect(renderPlayer(<WistiaVideo src={SRC} />).style.pointerEvents).toBe('none');
    expect(renderPlayer(<WistiaVideo src={SRC} controls />).style.pointerEvents).toBe('auto');
  });

  it('merges a style of its own rather than replacing the consumer’s', () => {
    const { style } = renderPlayer(<WistiaVideo src={SRC} style={{ borderRadius: 8 }} />);

    expect(style.borderRadius).toBe('8px');
    expect(style.pointerEvents).toBe('none');
  });

  it('spells loop the way Wistia does', () => {
    expect(renderPlayer(<WistiaVideo src={SRC} loop />).getAttribute('end-video-behavior')).toBe('loop');
  });

  it('sends defaultMuted as the muted state the player starts in', () => {
    expect(renderPlayer(<WistiaVideo src={SRC} defaultMuted />).getAttribute('muted')).toBe('true');
  });

  it('does not put a mute back after the viewer cleared it', () => {
    const { rerender, container } = render(<WistiaVideo src={SRC} defaultMuted />);
    const player = container.querySelector('wistia-player') as HTMLElement;
    expect(player.getAttribute('muted')).toBe('true');
    player.removeAttribute('muted');

    // Unmuting drives the element, not this prop. Re-sending it on a later render — for any reason, from
    // anywhere up the tree — would re-mute the player under the viewer.
    rerender(<WistiaVideo src={SRC} defaultMuted className="changed" />);

    expect(player.hasAttribute('muted')).toBe(false);
    expect(player.getAttribute('class')).toBe('changed');
  });

  it('deep-links a wtime start time the way the element does', () => {
    expect(renderPlayer(<WistiaVideo src={`${SRC}?wtime=30`} />).getAttribute('current-time')).toBe('30');
  });

  it('leaves currentTime alone for a source with no start time', () => {
    expect(renderPlayer(<WistiaVideo src={SRC} />).hasAttribute('current-time')).toBe(false);
  });

  it('resolves an empty preload, which Wistia does not accept', () => {
    expect(renderPlayer(<WistiaVideo src={SRC} preload="" />).getAttribute('preload')).toBe('metadata');
  });

  it('keeps playsInline to itself, since Wistia plays inline and has no knob for it', () => {
    expect(renderPlayer(<WistiaVideo src={SRC} playsInline />).hasAttribute('plays-inline')).toBe(false);
  });

  it('leaves out an option with no attribute spelling rather than writing nonsense', () => {
    const player = renderPlayer(<WistiaVideo src={SRC} source={{ playerColorGradient: { on: false } }} />);

    expect(player.hasAttribute('player-color-gradient')).toBe(false);
  });

  it('passes unknown props through to the player', () => {
    expect(renderPlayer(<WistiaVideo src={SRC} className="block w-full h-full" />).getAttribute('class')).toBe(
      'block w-full h-full'
    );
  });

  it('replaces the element when the media does, and keeps it when only an option changes', () => {
    const { rerender, container } = render(<WistiaVideo src={SRC} />);
    const first = container.querySelector('wistia-player');

    rerender(<WistiaVideo src={SRC} source={{ playerColor: '54bbff' }} />);
    expect(container.querySelector('wistia-player')).toBe(first);

    rerender(<WistiaVideo source={{ mediaId: 'abcde12345' }} />);
    expect(container.querySelector('wistia-player')).not.toBe(first);
  });

  it('normalizes the element as it mounts, since the store reads a media only once', () => {
    // Statically imported, so the element React hands the ref is already upgraded and there is nothing to
    // wait for. Wistia's own React wrapper defines it from an effect, and this would be a tick late.
    const player = renderPlayer(<WistiaVideo src={SRC} />);

    expect('seeking' in player).toBe(true);
    expect('source' in player).toBe(true);
  });
});
