/** @jsxImportSource ../../.. */

import { describe, it } from 'vitest';
import { createComponent, Slot } from '../../../jsx-runtime';
import type { ContainerProps } from '../container/container-core';
import type { GestureProps } from '../gesture/gesture-core';
import type { HotkeyProps } from '../hotkey/hotkey-core';
import { defineComponent } from '../manifest';

const PlayButton = createComponent(
  defineComponent()({
    name: 'PlayButton',
  })
);

const Slider = createComponent(
  defineComponent<{ orientation?: 'horizontal' | 'vertical'; thumbAlignment?: 'center' | 'edge' }>()({
    name: 'Slider',
    parts: ['Root', 'Track', 'Fill', 'Thumb'] as const,
  })
);

const Time = createComponent(
  defineComponent()({
    name: 'Time',
    parts: ['Value'] as const,
    partProps: {
      Value: {} as { type: 'current' | 'duration' },
    },
  })
);

const Container = createComponent(
  defineComponent<ContainerProps>()({
    name: 'Container',
  })
);

const Hotkey = createComponent(
  defineComponent<HotkeyProps>()({
    name: 'Hotkey',
  })
);

const Gesture = createComponent(
  defineComponent<GestureProps>()({
    name: 'Gesture',
  })
);

describe('constrained JSX', () => {
  it('accepts a single component', () => {
    void (<PlayButton className="x" />);
    void (<PlayButton key="play" />);
  });

  it('rejects invalid props on a single component', () => {
    // @ts-expect-error - className must be a string
    void (<PlayButton className={5} />);
    // @ts-expect-error - id is a target-specific attr, not a core JSX prop
    void (<PlayButton id="play" />);
    // @ts-expect-error - hidden is a target-specific attr, not a core JSX prop
    void (<PlayButton hidden />);
    // @ts-expect-error - commandfor is HTML-specific wiring
    void (<PlayButton commandfor="play-tooltip" />);
    // @ts-expect-error - render is a React adapter prop, not a core JSX prop
    void (<PlayButton render={<PlayButton />} />);
  });

  it('accepts compound parts inside their root', () => {
    void (
      <Slider.Root orientation="vertical" thumbAlignment="edge">
        <Slider.Track>
          <Slider.Fill />
        </Slider.Track>
        <Slider.Thumb />
      </Slider.Root>
    );
  });

  it('rejects invalid compound root props', () => {
    // @ts-expect-error - `bogus` is not a valid orientation
    void (<Slider.Root orientation="bogus" />);
    // @ts-expect-error - boundary is target-specific positioning, not a core prop
    void (<Slider.Root boundary="viewport" />);
  });

  it('accepts explicitly modeled input props', () => {
    void (<Hotkey keys="k" action="togglePaused" />);
    void (<Hotkey keys="f" action="toggleFullscreen" target="global" />);
    void (<Gesture type="doubletap" action="seekStep" value={10} pointer="touch" region="right" />);
  });

  it('rejects invalid input props', () => {
    // @ts-expect-error - global hotkeys use `global`, not DOM-specific `document`
    void (<Hotkey keys="k" action="togglePaused" target="document" />);
    // @ts-expect-error - invalid gesture region
    void (<Gesture type="tap" action="togglePaused" region="outside" />);
  });

  it('keeps container props target-neutral', () => {
    void (<Container className="skin" />);
    // @ts-expect-error - focusability is target output behavior
    void (<Container tabIndex={0} />);
  });

  it('rejects invalid Time.Value props', () => {
    void (<Time.Value type="current" className="t" />);
    // @ts-expect-error - `bogus` not in Time type union
    void (<Time.Value type="bogus" />);
  });

  it('rejects platform-specific intrinsic elements', () => {
    // @ts-expect-error - source JSX only exposes Video.js components
    void (<div className="row" />);
    // @ts-expect-error - source JSX only exposes Video.js components
    void (<span className="label" />);
    // @ts-expect-error - source JSX only exposes Video.js components
    void (<button type="button" />);
  });

  it('accepts slot primitives', () => {
    void (<Slot />);
    void (
      <Slot name="poster">
        <PlayButton className="fallback" />
      </Slot>
    );
    // @ts-expect-error - slot name must be a string
    void (<Slot name={5} />);
  });
});
