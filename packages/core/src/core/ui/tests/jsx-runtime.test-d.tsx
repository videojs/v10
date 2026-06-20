/** @jsxImportSource ../../.. */

import { describe, it } from 'vitest';
import { createComponent, Slot } from '../../../jsx-runtime';
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

describe('constrained JSX', () => {
  it('accepts a single component', () => {
    void (<PlayButton className="x" />);
  });

  it('rejects invalid props on a single component', () => {
    // @ts-expect-error - className must be a string
    void (<PlayButton className={5} />);
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
  });

  it('rejects invalid Time.Value props', () => {
    void (<Time.Value type="current" className="t" />);
    // @ts-expect-error - `bogus` not in Time type union
    void (<Time.Value type="bogus" />);
  });

  it('accepts div and span as layout intrinsics', () => {
    void (
      <div className="row">
        <span className="label">hello</span>
      </div>
    );
    // @ts-expect-error - arbitrary HTML attributes (id) are not allowed on layout intrinsics
    void (<div id="foo" />);
  });

  it('accepts slot primitives', () => {
    void (<Slot />);
    void (
      <Slot name="poster">
        <span className="fallback" />
      </Slot>
    );
    // @ts-expect-error - slot name must be a string
    void (<Slot name={5} />);
  });
});
