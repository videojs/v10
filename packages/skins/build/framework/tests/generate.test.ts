import { describe, expect, it } from 'vitest';
import { canonicalRoot, loadSkinCatalog } from '../../graph/load';
import { createFrameworkSkin } from '../generate';

describe('createFrameworkSkin', () => {
  it('bundles React into one Skin module and role-based vanilla stylesheets', async () => {
    const output = await createFrameworkSkin(await loadSkinCatalog(), {
      framework: 'react',
      rootDir: canonicalRoot,
      skin: 'default-video',
    });

    expect(output.sourceFile).toBe('skin.tsx');
    expect(output.source).not.toContain("import './styles.css'");
    expect(output.source).toContain('function PlayButton$1()');
    expect(output.source).toContain('export { DefaultVideoSkin }');
    expect(output.source).not.toContain('./components/');
    expect(style(output, 'styles/styles.css')).toContain("@import './buttons.css'");
    expect(style(output, 'styles/buttons.css')).toContain('.media-button {');
    expect(style(output, 'styles/buttons.css').match(/^\.media-button \{/gm)).toHaveLength(1);
    expect(style(output, 'styles/buttons.css')).not.toContain('.media-play-button {');
    expect(output.styles.map((file) => file.source).join('\n')).not.toContain('--tw-');
    expect(style(output, 'styles/preflight.css')).toContain('@scope (.media-skin)');
  });

  it('bundles HTML registrations and markup into one Skin module', async () => {
    const output = await createFrameworkSkin(await loadSkinCatalog(), {
      framework: 'html',
      rootDir: canonicalRoot,
      skin: 'default-video',
    });

    expect(output.sourceFile).toBe('skin.ts');
    expect(output.source).toContain("import '@videojs/html/icons/element'");
    expect(output.source).toContain('export const skin = /* html */ `<media-controls');
    expect(output.source).toContain(
      '<media-play-button class="media-button media-play-button" commandfor="play-tooltip">'
    );
    expect(output.source).toContain('<media-tooltip side="top" class="media-surface media-tooltip" id="play-tooltip">');
    expect(output.source).toContain('commandfor="seek-backward-tooltip"');
    expect(output.source).toContain('commandfor="seek-forward-tooltip"');
    expect(output.source).toContain('commandfor="volume-popover"');
    expect(output.source).toContain('commandfor="fullscreen-tooltip"');
    expect(output.source).toContain('<media-time-slider class="media-slider">');
    expect(output.source).toContain(
      '<media-volume-slider class="media-slider" thumb-alignment="edge" orientation="vertical">'
    );
    expect(output.source).toContain('<media-time class="media-time" type="remaining" toggle>');
    expect(output.source).toContain('open-on-hover');
    expect(output.source).toContain('delay="200"');
    expect(output.source).toContain('close-delay="100"');
    expect(style(output, 'styles/buttons.css')).toContain('.media-button {');
    expect(style(output, 'styles/buttons.css').match(/^\.media-button \{/gm)).toHaveLength(1);
    expect(output.styles.map((file) => file.source).join('\n')).not.toContain('--tw-');
  });
});

function style(output: Awaited<ReturnType<typeof createFrameworkSkin>>, fileName: string): string {
  const file = output.styles.find((candidate) => candidate.fileName === fileName);
  if (!file) throw new Error(`Missing generated style file \`${fileName}\`.`);
  return file.source;
}
