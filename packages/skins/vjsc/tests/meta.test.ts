import { describe, expect, it } from 'vite-plus/test';

import { skinStyles } from '../meta';
import { meta as defaultAudio } from '../skins/default-audio/skin';
import { meta as defaultLiveVideo } from '../skins/default-live-video/skin';
import { meta as defaultVideo } from '../skins/default-video/skin';
import { meta as minimalAudio } from '../skins/minimal-audio/skin';
import { meta as minimalLiveVideo } from '../skins/minimal-live-video/skin';
import { meta as minimalVideo } from '../skins/minimal-video/skin';

describe('skinStyles', () => {
  it('matches the style metadata captured from every published skin', () => {
    expect(skinStyles).toEqual({
      [defaultVideo.name]: defaultVideo.style,
      [minimalVideo.name]: minimalVideo.style,
      [defaultLiveVideo.name]: defaultLiveVideo.style,
      [minimalLiveVideo.name]: minimalLiveVideo.style,
      [defaultAudio.name]: defaultAudio.style,
      [minimalAudio.name]: minimalAudio.style,
    });
  });
});
