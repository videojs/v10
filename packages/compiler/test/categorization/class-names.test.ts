/**
 * className Categorization Tests
 *
 * Tests Phase 2: className categorization
 * Verifies className values are correctly categorized for transformation
 */

import { describe, expect, it } from 'vitest';
import { defaultCompilerConfig } from '../../src/configs/videojs-react-skin';
import { analyze } from '../../src/phases/analyze';
import { categorize } from '../../src/phases/categorize';
import { createInitialContext } from '../utils';

describe('className categorization', () => {
  it('identifies component-match (exact match)', () => {
    const source = `
      import { PlayButton } from '@videojs/react';
      import styles from './styles';
      export default function Skin() {
        return <PlayButton className={styles.PlayButton} />;
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const playButtonClassName = result.classNames.find(
      cn => cn.type === 'member-expression' && cn.key === 'PlayButton',
    );
    expect(playButtonClassName?.category).toBe('component-match');
  });

  it('identifies generic-style for non-matching keys', () => {
    const source = `
      import { PlayButton, MuteButton } from '@videojs/react';
      import styles from './styles';
      export default function Skin() {
        return (
          <div>
            <PlayButton className={styles.Button} />
            <MuteButton className={styles.Button} />
          </div>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    // Both usages of Button are generic-style (don't match component name)
    const buttonClassNames = result.classNames.filter(
      cn => cn.type === 'member-expression' && cn.key === 'Button',
    );
    expect(buttonClassNames).toHaveLength(2);
    expect(buttonClassNames.every(cn => cn.category === 'generic-style')).toBe(true);
  });

  it('identifies generic-style for compound component keys', () => {
    const source = `
      import { TimeSlider } from '@videojs/react';
      import styles from './styles';
      export default function Skin() {
        return (
          <TimeSlider.Root className={styles.SliderRoot}>
            <TimeSlider.Track className={styles.SliderTrack} />
          </TimeSlider.Root>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const rootClassName = result.classNames.find(
      cn => cn.type === 'member-expression' && cn.key === 'SliderRoot',
    );
    expect(rootClassName?.category).toBe('generic-style');

    const trackClassName = result.classNames.find(
      cn => cn.type === 'member-expression' && cn.key === 'SliderTrack',
    );
    expect(trackClassName?.category).toBe('generic-style');
  });

  it('identifies generic-style for layout containers', () => {
    const source = `
      import styles from './styles';
      export default function Skin() {
        return (
          <div className={styles.Container}>
            <div className={styles.Controls} />
          </div>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const containerClassName = result.classNames.find(
      cn => cn.type === 'member-expression' && cn.key === 'Container',
    );
    expect(containerClassName?.category).toBe('generic-style');

    const controlsClassName = result.classNames.find(
      cn => cn.type === 'member-expression' && cn.key === 'Controls',
    );
    expect(controlsClassName?.category).toBe('generic-style');
  });

  it('handles mixed patterns in same skin', () => {
    const source = `
      import { PlayButton } from '@videojs/react';
      import styles from './styles';
      export default function Skin() {
        return (
          <div className={styles.Container}>
            <PlayButton className={\`\${styles.PlayButton} \${styles.Button}\`} />
          </div>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const categories = new Map(
      result.classNames
        .filter(cn => cn.type === 'member-expression')
        .map(cn => [cn.key, cn.category]),
    );

    expect(categories.get('Container')).toBe('generic-style');
    expect(categories.get('PlayButton')).toBe('component-match');
    expect(categories.get('Button')).toBe('generic-style');
  });

  it('categorizes string literal className as literal-classes', () => {
    const source = `
      export default function Skin() {
        return <div className="button primary active" />;
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    expect(result.classNames).toHaveLength(1);
    expect(result.classNames[0].type).toBe('string-literal');
    expect(result.classNames[0].category).toBe('literal-classes');

    if (result.classNames[0].type === 'string-literal') {
      expect(result.classNames[0].classes).toEqual(['button', 'primary', 'active']);
    }
  });
});
