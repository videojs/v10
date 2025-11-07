/**
 * Tests for import transformation
 */

import { describe, expect, it } from 'vitest';
import { compileForTest as compile } from './helpers/compile';

describe('import Transformation', () => {
  describe('react imports', () => {
    it('removes React import', () => {
      const source = `
        import { useState } from 'react';
        export default () => <div />;
      `;

      const result = compile(source);
      expect(result.removedImports).toContain('react');
      expect(result.imports).not.toContain(expect.stringContaining('react'));
    });

    it('removes React type imports', () => {
      const source = `
        import type { PropsWithChildren } from 'react';
        export default () => <div />;
      `;

      const result = compile(source);
      expect(result.removedImports).toContain('react');
    });
  });

  describe('@videojs/react component imports', () => {
    it('transforms single component import', () => {
      const source = `
        import { PlayButton } from '@videojs/react';
        export default () => <PlayButton />;
      `;

      const result = compile(source);
      expect(result.imports).toContain(`import '@/define/media-play-button';`);
    });

    it('transforms multiple component imports', () => {
      const source = `
        import { PlayButton, MuteButton, TimeSlider } from '@videojs/react';
        export default () => <div><PlayButton /><MuteButton /><TimeSlider /></div>;
      `;

      const result = compile(source);
      expect(result.imports).toContain(`import '@/define/media-play-button';`);
      expect(result.imports).toContain(`import '@/define/media-mute-button';`);
      expect(result.imports).toContain(`import '@/define/media-time-slider';`);
    });

    it('transforms MediaContainer correctly', () => {
      const source = `
        import { MediaContainer } from '@videojs/react';
        export default () => <MediaContainer />;
      `;

      const result = compile(source);
      expect(result.imports).toContain(`import '@/define/media-container';`);
    });
  });

  describe('@videojs/react/icons imports', () => {
    it('transforms icon imports to single icons import', () => {
      const source = `
        import { PlayIcon, PauseIcon } from '@videojs/react/icons';
        export default () => <div><PlayIcon /><PauseIcon /></div>;
      `;

      const result = compile(source);
      expect(result.imports).toContain(`import '@/icons';`);
    });
  });

  describe('style imports', () => {
    it('transforms .ts style import to .css', () => {
      const source = `
        import styles from './styles.ts';
        export default () => <div className={styles.button} />;
      `;

      const result = compile(source);
      expect(result.imports).toContain(`import styles from './styles.css';`);
    });

    it('transforms /styles import to /styles.css', () => {
      const source = `
        import styles from './styles';
        export default () => <div className={styles.container} />;
      `;

      const result = compile(source);
      expect(result.imports).toContain(`import styles from './styles.css';`);
    });
  });

  describe('complete example', () => {
    it('transforms all imports in realistic component', () => {
      const source = `
        import type { PropsWithChildren } from 'react';
        import { PlayButton, TimeSlider } from '@videojs/react';
        import { PlayIcon, PauseIcon } from '@videojs/react/icons';
        import styles from './styles';

        export default function TestSkin({ children }: PropsWithChildren) {
          return (
            <div>
              {children}
              <PlayButton className={styles.button}>
                <PlayIcon />
              </PlayButton>
            </div>
          );
        }
      `;

      const result = compile(source);

      // Should have HTML imports
      expect(result.imports).toContain(`import '@/define/media-play-button';`);
      expect(result.imports).toContain(`import '@/define/media-time-slider';`);
      expect(result.imports).toContain(`import '@/icons';`);
      expect(result.imports).toContain(`import styles from './styles.css';`);

      // Should remove React
      expect(result.removedImports).toContain('react');

      // Should NOT have React imports in output
      expect(result.imports).not.toContain('react');
    });
  });
});
