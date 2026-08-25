import { describe, expect, it } from 'vite-plus/test';

import { skinStyles } from '../meta';
import { meta as defaultVideo } from '../skins/default-video/skin';
import { meta as minimalVideo } from '../skins/minimal-video/skin';

describe('skinStyles', () => {
  it('matches the style metadata captured from every published skin', () => {
    expect(skinStyles).toEqual({
      [defaultVideo.name]: defaultVideo.style,
      [minimalVideo.name]: minimalVideo.style,
    });
  });
});
