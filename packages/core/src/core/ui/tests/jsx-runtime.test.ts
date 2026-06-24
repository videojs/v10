import { describe, expect, it } from 'vitest';

import { createComponent } from '../../../jsx-runtime';
import { defineComponent, defineComponentPart, defineComponentPartGroup } from '../manifest';

describe('createComponent', () => {
  it('creates nested component parts with dotted part paths', () => {
    const Slider = createComponent(
      defineComponent()({
        name: 'Slider',
        parts: {
          Root: defineComponentPart(),
          Thumbnail: defineComponentPartGroup({
            Root: defineComponentPart(),
            Image: defineComponentPart(),
          }),
        },
      })
    );

    expect(Slider.Root.$$component).toEqual({ name: 'Slider', part: 'Root' });
    expect(Slider.Thumbnail.Root.$$component).toEqual({ name: 'Slider', part: 'Thumbnail.Root' });
    expect(Slider.Thumbnail.Image.$$component).toEqual({ name: 'Slider', part: 'Thumbnail.Image' });
  });
});
