import { describe, expect, it } from 'vite-plus/test';

import { poster as defaultPoster } from '../../src/default/tailwind/components/poster';
import { poster as minimalPoster } from '../../src/minimal/tailwind/components/poster';

const posters = [
  ['default', defaultPoster],
  ['minimal', minimalPoster],
] as const;

describe.each(posters)('%s poster', (_, poster) => {
  it('hides the rendered image while it has no source', () => {
    expect(poster(false)).toContain('[&:is(img):not([src]):not([srcset])]:invisible');
  });

  it('hides source-less fallback and slotted images in the Shadow DOM', () => {
    const className = poster(true);

    expect(className).toContain('[&>slot>img:not([src]):not([srcset])]:invisible');
    expect(className).toContain('[&_::slotted(img:not([src]):not([srcset]))]:invisible');
  });
});
