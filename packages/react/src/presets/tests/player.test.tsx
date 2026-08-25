import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';

import { AudioPlayer } from '../audio/player';
import { BackgroundVideoPlayer } from '../background/player';
import { LiveAudioPlayer } from '../live-audio/player';
import { LiveVideoPlayer } from '../live-video/player';
import { usePlayer as useVideoPlayer, VideoPlayer } from '../video/player';

describe('preset players', () => {
  it.each([
    ['VideoPlayer', VideoPlayer],
    ['AudioPlayer', AudioPlayer],
    ['BackgroundVideoPlayer', BackgroundVideoPlayer],
    ['LiveVideoPlayer', LiveVideoPlayer],
    ['LiveAudioPlayer', LiveAudioPlayer],
  ])('exports the preconfigured %s component', (displayName, Player) => {
    expect(Player.displayName).toBe(displayName);
  });

  it('exports the player and hook as separate values', () => {
    expect(VideoPlayer).not.toHaveProperty('Provider');
    expect(VideoPlayer).not.toHaveProperty('usePlayer');
    expect(useVideoPlayer).toBeTypeOf('function');
  });

  it('forwards preset configuration props to the player store', () => {
    function Title() {
      const title = useVideoPlayer((state) => state.title);

      return <span>{title}</span>;
    }

    render(
      <VideoPlayer title="Preset title">
        <Title />
      </VideoPlayer>
    );

    expect(screen.getByText('Preset title')).toBeTruthy();
  });
});
