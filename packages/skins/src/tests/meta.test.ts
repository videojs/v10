import { describe, expect, it } from 'vite-plus/test';

import { type SkinMeta, skinStyles } from '../meta';
import { meta as defaultAudio } from '../skins/default-audio/skin';
import { meta as defaultLiveAudio } from '../skins/default-live-audio/skin';
import { meta as defaultLiveVideo } from '../skins/default-live-video/skin';
import { meta as defaultVideo } from '../skins/default-video/skin';
import { meta as minimalAudio } from '../skins/minimal-audio/skin';
import { meta as minimalLiveAudio } from '../skins/minimal-live-audio/skin';
import { meta as minimalLiveVideo } from '../skins/minimal-live-video/skin';
import { meta as minimalVideo } from '../skins/minimal-video/skin';

const published: readonly SkinMeta[] = [
  defaultVideo,
  minimalVideo,
  defaultLiveVideo,
  minimalLiveVideo,
  defaultLiveAudio,
  minimalLiveAudio,
  defaultAudio,
  minimalAudio,
];

describe('skinStyles', () => {
  it('describes exactly the published skins', () => {
    expect(Object.keys(skinStyles).sort()).toEqual(published.map((meta) => meta.name).sort());
  });

  it('derives each scope from its theme and preset', () => {
    for (const [name, style] of Object.entries(skinStyles)) {
      expect(name).toBe(`${style.theme}-${style.preset}`);
      expect(style.scope).toBe(`.media-skin[data-theme="${style.theme}"][data-preset="${style.preset}"]`);
    }
  });
});
