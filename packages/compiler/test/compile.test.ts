/**
 * End-to-End Compilation Tests
 *
 * Tests complete pipeline: Analysis → Categorization → Projection → Module Composition
 * Verifies complete HTML skin module output
 */

import { describe, expect, it } from 'vitest';
import { compile } from '../src/compile';
import { createSourceContext } from './utils';

describe('compile', () => {
  it('compiles simple React skin to complete HTML module', () => {
    const source = `
      import { PlayButton } from '@videojs/react';
      import styles from './styles';

      export default function SimpleSkin() {
        return (
          <div className={styles.Container}>
            <PlayButton />
          </div>
        );
      }
    `;

    const result = compile(createSourceContext(source));

    // Verify imports section
    expect(result).toContain(`import { MediaSkinElement } from '@/media/media-skin';`);
    expect(result).toContain(`import { defineCustomElement } from '@/utils/custom-element';`);
    expect(result).toContain(`import styles from './styles.css';`);
    expect(result).toContain(`import '@/define/media-play-button';`);

    // Verify template function
    expect(result).toContain('export function getTemplateHTML()');
    expect(result).toContain('$' + '{MediaSkinElement.getTemplateHTML()}');
    expect(result).toContain('<style>$' + '{styles}</style>');

    // Verify class declaration
    expect(result).toContain('export class MediaSkinSimpleElement extends MediaSkinElement');
    expect(result).toContain('static getTemplateHTML: () => string = getTemplateHTML');

    // Verify custom element registration
    expect(result).toContain(`defineCustomElement('media-skin-simple', MediaSkinSimpleElement);`);
  });

  it('compiles FrostedSkin with correct naming', () => {
    const source = `
      import { PlayButton, MuteButton } from '@videojs/react';
      import { PlayIcon } from '@/icons';
      import styles from './styles';

      export default function FrostedSkin() {
        return (
          <div className={styles.Container}>
            <PlayButton>
              <PlayIcon />
            </PlayButton>
            <MuteButton />
          </div>
        );
      }
    `;

    const result = compile(createSourceContext(source));

    // Verify derived names
    expect(result).toContain('export class MediaSkinFrostedElement');
    expect(result).toContain(`defineCustomElement('media-skin-frosted', MediaSkinFrostedElement);`);

    // Verify icon import deduplicated
    expect(result).toContain(`import '@/icons';`);
    const iconMatches = result.match(/import '@\/icons';/g);
    expect(iconMatches).toHaveLength(1); // Only once!
  });

  // External imports are currently unsupported
  it.skip('removes framework imports and keeps external', () => {
    const source = `
      import type { PropsWithChildren } from 'react';
      import { PlayButton } from '@videojs/react';
      import { clsx } from 'clsx';
      import styles from './styles';

      export default function MySkin({ children }: PropsWithChildren) {
        return <div className={styles.Container}><PlayButton /></div>;
      }
    `;

    const result = compile(createSourceContext(source));

    // Framework removed
    expect(result).not.toContain('react');
    expect(result).not.toContain('PropsWithChildren');

    // External kept
    expect(result).toContain(`import { clsx } from 'clsx';`);
  });

  it('handles custom style variable name from context', () => {
    const source = `
      import { PlayButton } from '@videojs/react';
      import myStyles from './theme';

      export default function CustomSkin() {
        return <div className={myStyles.Container}><PlayButton /></div>;
      }
    `;

    const result = compile(createSourceContext(source));

    // Style import uses convention 'styles' (not 'myStyles')
    expect(result).toContain(`import styles from './theme.css';`);

    // Template uses convention
    expect(result).toContain('<style>$' + '{styles}</style>');
  });

  it('includes base framework imports', () => {
    const source = `
      import { PlayButton } from '@videojs/react';
      import styles from './styles';

      export default function TestSkin() {
        return <PlayButton />;
      }
    `;

    const result = compile(createSourceContext(source));

    // Verify base imports are always included
    expect(result).toContain(`import { MediaSkinElement } from '@/media/media-skin';`);
    expect(result).toContain(`import { defineCustomElement } from '@/utils/custom-element';`);

    // Base imports should come first
    const mediaSkinPos = result.indexOf(`import { MediaSkinElement }`);
    const playButtonPos = result.indexOf(`import '@/define/media-play-button';`);
    expect(mediaSkinPos).toBeLessThan(playButtonPos);
  });
});
