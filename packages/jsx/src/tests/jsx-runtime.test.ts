import { describe, expect, it } from 'vitest';
import { createComponent, jsx, VIDEOJS_NODE } from '../jsx-runtime';
import { defineComponent } from '../manifest';

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

  it('creates inert compiler nodes without evaluating components', () => {
    const PlayButton = createComponent(defineComponent({ name: 'PlayButton' }));
    const node = jsx(PlayButton, { className: 'play' }, 'control');

    expect(node).toEqual({
      [VIDEOJS_NODE]: true,
      type: PlayButton,
      props: { className: 'play' },
      key: 'control',
    });
  });

  it('fails when a canonical component is evaluated outside the compiler runtime', () => {
    const PlayButton = createComponent(defineComponent({ name: 'PlayButton' }));

    expect(() => PlayButton({})).toThrow('<PlayButton> can only be evaluated by the compiler');
  });
});
