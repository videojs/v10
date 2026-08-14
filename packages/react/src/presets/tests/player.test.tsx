import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AudioPlayer } from '../audio/player';
import { BackgroundVideoPlayer } from '../background/player';
import { LiveAudioPlayer } from '../live-audio/player';
import { LiveVideoPlayer } from '../live-video/player';
import { usePlayer as useVideoPlayer, VideoPlayer } from '../video/player';

describe('preset players', () => {
  it.each([
    ['VideoPlayer.Provider', VideoPlayer.Provider],
    ['AudioPlayer.Provider', AudioPlayer.Provider],
    ['BackgroundVideoPlayer.Provider', BackgroundVideoPlayer.Provider],
    ['LiveVideoPlayer.Provider', LiveVideoPlayer.Provider],
    ['LiveAudioPlayer.Provider', LiveAudioPlayer.Provider],
  ])('exports the preconfigured %s component', (displayName, Provider) => {
    expect(Provider.displayName).toBe(displayName);
  });

  it('exports the preset hook as the player hook', () => {
    expect(useVideoPlayer).toBe(VideoPlayer.usePlayer);
  });

  it('forwards preset configuration props to the player store', () => {
    function Title() {
      const title = useVideoPlayer((state) => state.contentTitle);
      return <span>{title}</span>;
    }

    render(
      <VideoPlayer.Provider contentTitle="Preset title">
        <Title />
      </VideoPlayer.Provider>
    );

    expect(screen.getByText('Preset title')).toBeTruthy();
  });
});
