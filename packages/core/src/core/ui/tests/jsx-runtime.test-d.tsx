/** @jsxImportSource @videojs/jsx */

import { Slot } from '@videojs/jsx';
import { describe, it } from 'vitest';
import {
  Controls,
  FullscreenButton,
  MuteButton,
  PlayButton,
  Popover,
  SeekButton,
  Slider,
  Text,
  Time,
  TimeSlider,
  Tooltip,
  VolumeSlider,
} from '../components.generated';

describe('constrained JSX', () => {
  it('accepts typed components and nested compound parts', () => {
    void (
      <Controls.Root className="controls">
        <Tooltip.Provider delay={300}>
          <Controls.Group>
            <Tooltip.Root side="top">
              <Tooltip.Trigger>
                <PlayButton className={['button', undefined, false]} />
              </Tooltip.Trigger>
              <Tooltip.Popup>
                <Tooltip.Label />
                <Tooltip.Shortcut />
              </Tooltip.Popup>
            </Tooltip.Root>
            <SeekButton seconds={-10} />
          </Controls.Group>
        </Tooltip.Provider>
      </Controls.Root>
    );

    void (
      <Time.Group>
        <Time.Value type="current" />
        <TimeSlider.Root thumbAlignment="edge">
          <TimeSlider.Track>
            <TimeSlider.Fill />
            <TimeSlider.Buffer />
          </TimeSlider.Track>
          <TimeSlider.Thumb />
          <Slider.Thumbnail.Root>
            <Slider.Thumbnail.Image />
            <TimeSlider.Value type="pointer" />
          </Slider.Thumbnail.Root>
          <TimeSlider.Preview />
        </TimeSlider.Root>
        <Time.Value type="remaining" toggle />
      </Time.Group>
    );

    void (
      <Popover.Root openOnHover>
        <Popover.Trigger>
          <MuteButton />
        </Popover.Trigger>
        <Popover.Popup>
          <VolumeSlider.Root orientation="vertical">
            <VolumeSlider.Track>
              <VolumeSlider.Fill />
            </VolumeSlider.Track>
            <VolumeSlider.Thumb />
          </VolumeSlider.Root>
        </Popover.Popup>
      </Popover.Root>
    );

    void (<FullscreenButton key="fullscreen" />);
    void (<Text>10</Text>);
  });

  it('rejects target-specific and invalid props', () => {
    // @ts-expect-error - id is target-specific identity
    void (<PlayButton id="play" />);
    // @ts-expect-error - commandfor is HTML-specific wiring
    void (<PlayButton commandfor="play-tooltip" />);
    // @ts-expect-error - render is a React adapter prop
    void (<PlayButton render={<PlayButton />} />);
    // @ts-expect-error - className values must be class-compatible
    void (<PlayButton className={['button', 1]} />);
    // @ts-expect-error - empty compound parts do not accept target attributes
    void (<Controls.Group id="start-controls" />);
    // @ts-expect-error - seconds must be numeric
    void (<SeekButton seconds="10" />);
    // @ts-expect-error - invalid time display type
    void (<Time.Value type="elapsed" />);
    // @ts-expect-error - invalid slider orientation
    void (<VolumeSlider.Root orientation="diagonal" />);
  });

  it('rejects platform intrinsic elements', () => {
    // @ts-expect-error - canonical source exposes Video.js components only
    void (<div className="row" />);
    // @ts-expect-error - canonical source exposes Video.js components only
    void (<span className="label" />);
    // @ts-expect-error - canonical source exposes Video.js components only
    void (<button type="button" />);
  });

  it('accepts target-neutral slots', () => {
    void (<Slot />);
    void (
      <Slot name="poster">
        <PlayButton />
      </Slot>
    );
    // @ts-expect-error - slot names are strings
    void (<Slot name={5} />);
  });
});
