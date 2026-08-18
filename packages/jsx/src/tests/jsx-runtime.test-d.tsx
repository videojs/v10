/** @jsxImportSource .. */

import { createComponent, Slot } from '../jsx-runtime';
import { defineComponent } from '../manifest';

const Button = createComponent(defineComponent<{ disabled?: boolean }>({ name: 'Button' }));
const Slider = createComponent(
  defineComponent({
    name: 'Slider',
    parts: {
      Root: defineComponent<{ orientation?: 'horizontal' | 'vertical' }>(),
      Thumb: defineComponent(),
    },
  })
);

void (<Button className={['button', undefined, false]} disabled />);
void (
  <Slider.Root orientation="vertical">
    <Slider.Thumb />
  </Slider.Root>
);
void (<Slot name="poster" />);

// @ts-expect-error - target-specific props are not part of canonical components
void (<Button id="play" />);
// @ts-expect-error - class names contain only class-compatible values
void (<Button className={['button', 1]} />);
// @ts-expect-error - compound part props remain typed
void (<Slider.Root orientation="diagonal" />);
// @ts-expect-error - canonical source rejects platform intrinsics
void (<button type="button" />);
