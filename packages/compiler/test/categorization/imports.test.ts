/**
 * Import Categorization Tests
 *
 * Tests Phase 2: Import categorization
 * Verifies imports are correctly categorized based on usage
 */

import { describe, expect, it } from 'vitest';
import { defaultCompilerConfig } from '../../src/configs/videojs-react-skin';
import { analyze } from '../../src/phases/analyze';
import { categorize } from '../../src/phases/categorize';
import { createInitialContext } from '../utils';

describe('import categorization', () => {
  it('categorizes VJS component imports', () => {
    const source = `
      import { PlayButton } from '@videojs/react';
      export default function Skin() {
        return <PlayButton />;
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const vjsImport = result.imports.find(i => i.source === '@videojs/react');
    expect(vjsImport?.category).toBe('vjs-component');
  });

  it('categorizes framework imports', () => {
    const source = `
      import type { PropsWithChildren } from 'react';
      export default function Skin({ children }: PropsWithChildren) {
        return <div>{children}</div>;
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const reactImport = result.imports.find(i => i.source === 'react');
    expect(reactImport?.category).toBe('framework');
  });

  it('categorizes style imports', () => {
    const source = `
      import styles from './styles';
      export default function Skin() {
        return <div className={styles.Container} />;
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const styleImport = result.imports.find(i => i.source === './styles');
    expect(styleImport?.category).toBe('style');
  });

  it('categorizes VJS core imports', () => {
    const source = `
      import { formatTime } from '@videojs/utils';
      export default function Skin() {
        return <div />;
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const coreImport = result.imports.find(i => i.source === '@videojs/utils');
    expect(coreImport?.category).toBe('vjs-core');
  });

  it('categorizes VJS icon imports', () => {
    const source = `
      import { PlayIcon, PauseIcon } from '@/icons';
      export default function Skin() {
        return (
          <div>
            <PlayIcon />
            <PauseIcon />
          </div>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const iconImport = result.imports.find(i => i.source === '@/icons');
    expect(iconImport?.category).toBe('vjs-icon');
  });

  it('categorizes external imports', () => {
    const source = `
      import { someUtility } from 'lodash';
      export default function Skin() {
        return <div />;
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const externalImport = result.imports.find(i => i.source === 'lodash');
    expect(externalImport?.category).toBe('external');
  });

  it('handles multiple imports with different categories', () => {
    const source = `
      import type { PropsWithChildren } from 'react';
      import { PlayButton } from '@videojs/react';
      import { PlayIcon } from '@/icons';
      import styles from './styles';

      export default function Skin({ children }: PropsWithChildren) {
        return (
          <div className={styles.Container}>
            <PlayButton className={styles.Button}>
              <PlayIcon />
            </PlayButton>
          </div>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    expect(result.imports).toHaveLength(4);

    const categories = new Map(
      result.imports.map(i => [i.source, i.category]),
    );

    expect(categories.get('react')).toBe('framework');
    expect(categories.get('@videojs/react')).toBe('vjs-component');
    expect(categories.get('@/icons')).toBe('vjs-icon'); // Icons get their own category
    expect(categories.get('./styles')).toBe('style');
  });
});
