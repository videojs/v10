import { describe, expect, expectTypeOf, it } from 'vite-plus/test';

import { defineComponent } from '../definition';
import {
  type ClassNameValue,
  createComponent,
  jsx,
  type Props,
  VIDEOJS_NODE,
  type VjscElement,
  type VjscNode,
} from '../jsx-runtime';

describe('createComponent', () => {
  it('creates nested component parts with dotted part paths', () => {
    const Slider = createComponent(
      defineComponent({
        name: 'Slider',
        parts: {
          Root: defineComponent(),
          Thumbnail: defineComponent({
            parts: {
              Root: defineComponent(),
              Image: defineComponent(),
            },
          }),
        },
      })
    );

    expect(Slider.Root.$$component).toEqual({ name: 'Slider', part: 'Root' });
    expect(Slider.Thumbnail.Root.$$component).toEqual({ name: 'Slider', part: 'Thumbnail.Root' });
    expect(Slider.Thumbnail.Image.$$component).toEqual({ name: 'Slider', part: 'Thumbnail.Image' });
  });

  it('creates inert source nodes without evaluating components', () => {
    const PlayButton = createComponent(defineComponent({ name: 'PlayButton' }));
    const node = jsx(PlayButton, { className: 'play' }, 'control');

    expectTypeOf(node).toEqualTypeOf<VjscElement>();
    expectTypeOf<VjscNode>().toEqualTypeOf<unknown>();

    expect(node).toEqual({
      [VIDEOJS_NODE]: true,
      type: PlayButton,
      props: { className: 'play' },
      key: 'control',
    });
  });

  it('accepts class lists in canonical component props and attributes', () => {
    const PlayButton = createComponent(defineComponent({ name: 'PlayButton' }));

    expectTypeOf<Props['className']>().toEqualTypeOf<ClassNameValue>();
    expectTypeOf<Parameters<typeof PlayButton>[0]['className']>().toEqualTypeOf<ClassNameValue>();
  });

  it('fails when a canonical component is evaluated outside a VJSC transform', () => {
    const PlayButton = createComponent(defineComponent({ name: 'PlayButton' }));

    expect(() => PlayButton({})).toThrow('<PlayButton> can only be evaluated by a VJSC transform');
  });
});
