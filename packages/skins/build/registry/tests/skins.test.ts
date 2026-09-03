import { describe, expect, it } from 'vitest';
import type { GraphModule } from 'vjsc/graph';

import type { SkinModuleMeta } from '../../../src/meta.ts';
import { skinModuleTarget } from '../items/skins.ts';

function graphModule(sourcePath: string): GraphModule<SkinModuleMeta> {
  return {
    id: sourcePath,
    filename: `/skins/src/${sourcePath}`,
    sourcePath,
    params: {},
    source: '',
    imports: [],
    styles: { files: [], assets: [] },
  };
}

describe('skinModuleTarget', () => {
  const root = graphModule('skins/minimal-audio/skin.tsx');

  it('places the skin root and its components under the skin directory', () => {
    expect(skinModuleTarget(root, root, 'minimal-audio')).toBe('skins/audio/minimal/skin.tsx');
    expect(skinModuleTarget(graphModule('components/sliders/slider.tsx'), root, 'minimal-audio')).toBe(
      'skins/audio/minimal/ui/sliders/slider.tsx'
    );
  });

  it('keeps a skin-owned module in its owner directory', () => {
    expect(skinModuleTarget(graphModule('skins/minimal-audio/controls.tsx'), root, 'minimal-audio')).toBe(
      'skins/audio/minimal/controls.tsx'
    );
  });

  it('gives each theme its own copy of a preset-shared module', () => {
    const timeSlider = graphModule('skins/audio/time-slider.tsx');

    expect(skinModuleTarget(timeSlider, root, 'minimal-audio')).toBe('skins/audio/minimal/time-slider.tsx');
    expect(skinModuleTarget(timeSlider, graphModule('skins/default-audio/skin.tsx'), 'default-audio')).toBe(
      'skins/audio/time-slider.tsx'
    );
  });

  it('leaves modules shared by every skin in place', () => {
    expect(skinModuleTarget(graphModule('skins/shared/playback-hotkeys.tsx'), root, 'minimal-audio')).toBe(
      'skins/shared/playback-hotkeys.tsx'
    );
  });
});
