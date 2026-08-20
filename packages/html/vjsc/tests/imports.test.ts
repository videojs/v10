import { describe, expect, it } from 'vitest';

import { resolvePackageImport } from '../imports';

describe('resolvePackageImport', () => {
  it('maps public definitions relative to generated HTML source', () => {
    expect(resolvePackageImport('@videojs/html/ui/play-button', 'src/__generated__/skins/default-video/skin.ts')).toBe(
      '../../../define/ui/play-button'
    );
    expect(resolvePackageImport('@videojs/html/media/container', 'src/__generated__/skins/default-video/skin.ts')).toBe(
      '../../../define/media/container'
    );
    expect(
      resolvePackageImport('@videojs/html/icons/element/minimal', 'src/__generated__/skins/default-video/skin.ts')
    ).toBe('../../../icons/element/minimal');
  });

  it('rejects imports the HTML package does not own', () => {
    expect(() => resolvePackageImport('external-package', 'src/generated.ts')).toThrow(
      'Cannot resolve HTML package import `external-package`.'
    );
  });
});
