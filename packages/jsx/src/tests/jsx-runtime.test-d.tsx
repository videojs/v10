/** @jsxImportSource .. */

import { createComponent, Slot, Template } from '../jsx-runtime';
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
void (
  <Template name="item" className="item">
    <Template.Part name="label">
      <Button />
    </Template.Part>
  </Template>
);

// @ts-expect-error - target-specific props are not part of canonical components
void (<Button id="play" />);
// @ts-expect-error - class names contain only class-compatible values
void (<Button className={['button', 1]} />);
// @ts-expect-error - compound part props remain typed
void (<Slider.Root orientation="diagonal" />);
// @ts-expect-error - canonical source rejects platform intrinsics
void (<button type="button" />);
// @ts-expect-error - templates require a static semantic name
void (<Template />);
// @ts-expect-error - template parts require one authored child
void (<Template.Part name="label" />);
