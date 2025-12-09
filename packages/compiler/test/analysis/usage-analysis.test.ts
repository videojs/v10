/**
 * Usage Analysis Tests
 *
 * Tests Phase 1: Identification
 * Verifies that usage analysis correctly extracts all usage patterns
 */

import type { JSXUsage } from '../../src/configs/types';
import { describe, expect, it } from 'vitest';
import { defaultCompilerConfig } from '../../src/configs/videojs-react-skin';
import { analyze } from '../../src/phases/analyze';
import { createInitialContext } from '../utils';

// Helper functions for tree traversal
function findInTree(root: JSXUsage, predicate: (el: JSXUsage) => boolean): JSXUsage | undefined {
  if (predicate(root)) return root;
  for (const child of root.children) {
    const found = findInTree(child, predicate);
    if (found) return found;
  }
  return undefined;
}

function findAllInTree(root: JSXUsage, predicate: (el: JSXUsage) => boolean): JSXUsage[] {
  const results: JSXUsage[] = [];
  if (predicate(root)) results.push(root);
  for (const child of root.children) {
    if ('node' in child) {
      // Only recurse into JSXUsage elements
      results.push(...findAllInTree(child, predicate));
    }
  }
  return results;
}

function countAllElements(root: JSXUsage): number {
  return 1 + root.children.reduce((sum, child) => {
    if ('node' in child) {
      // Only count JSXUsage elements
      return sum + countAllElements(child);
    }
    return sum;
  }, 0);
}

describe('usage analysis', () => {
  describe('import extraction', () => {
    it('extracts named imports', () => {
      const source = `
        import { PlayButton, MuteButton } from '@videojs/react';
        export default function Skin() { return <div />; }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      expect(usage.imports).toHaveLength(1);
      expect(usage.imports[0]).toMatchObject({
        source: '@videojs/react',
        specifiers: {
          named: ['PlayButton', 'MuteButton'],
        },
      });
      expect(usage.imports[0].node).toBeDefined();
    });

    it('extracts default imports', () => {
      const source = `
        import styles from './styles';
        export default function Skin() { return <div />; }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      expect(usage.imports).toHaveLength(1);
      expect(usage.imports[0]).toMatchObject({
        source: './styles',
        specifiers: {
          default: 'styles',
          named: [],
        },
      });
    });

    it('extracts namespace imports', () => {
      const source = `
        import * as Icons from '@/icons';
        export default function Skin() { return <div />; }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      expect(usage.imports).toHaveLength(1);
      expect(usage.imports[0]).toMatchObject({
        source: '@/icons',
        specifiers: {
          namespace: 'Icons',
          named: [],
        },
      });
    });

    it('extracts mixed imports', () => {
      const source = `
        import React, { useState } from 'react';
        export default function Skin() { return <div />; }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      expect(usage.imports).toHaveLength(1);
      expect(usage.imports[0]).toMatchObject({
        source: 'react',
        specifiers: {
          default: 'React',
          named: ['useState'],
        },
      });
    });

    it('extracts multiple icon imports', () => {
      const source = `
        import {
          PlayIcon,
          PauseIcon,
          FullscreenEnterIcon,
          FullscreenExitIcon,
        } from '@/icons';
        export default function Skin() { return <div />; }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      expect(usage.imports).toHaveLength(1);
      expect(usage.imports[0].specifiers.named).toEqual([
        'PlayIcon',
        'PauseIcon',
        'FullscreenEnterIcon',
        'FullscreenExitIcon',
      ]);
    });
  });

  describe('jsx usage extraction', () => {
    it('tracks which identifiers are used as JSX elements', () => {
      const source = `
        import { PlayButton } from '@videojs/react';
        export default function Skin() {
          return (
            <div>
              <PlayButton />
              <PlayButton />
            </div>
          );
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      // Tree has 3 total elements: div (root) + 2 PlayButtons (children)
      expect(countAllElements(usage.jsx!)).toBe(3);

      const divRoot = usage.jsx;
      const buttonUsages = findAllInTree(usage.jsx!, u => u.identifier === 'PlayButton');

      expect(divRoot!.identifier).toBe('div');
      expect(divRoot!.node).toBeDefined();

      expect(buttonUsages).toHaveLength(2); // Two separate instances
      expect(buttonUsages[0].node).toBeDefined();
      expect(buttonUsages[1].node).toBeDefined();
    });

    it('tracks compound component usage with separate entries', () => {
      const source = `
        import { TimeSlider } from '@videojs/react';
        export default function Skin() {
          return (
            <TimeSlider.Root>
              <TimeSlider.Track />
            </TimeSlider.Root>
          );
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      // Root is the top-level element, Track is its child
      const rootUsage = usage.jsx;
      const trackUsage = findInTree(
        usage.jsx!,
        u => u.identifier === 'TimeSlider' && u.member === 'Track',
      );

      expect(rootUsage!.identifier).toBe('TimeSlider');
      expect(rootUsage!.member).toBe('Root');
      expect(rootUsage!.node).toBeDefined();

      expect(trackUsage).toBeDefined();
      expect(trackUsage!.node).toBeDefined();
    });

    it('tracks multiple instances with distinct attributes separately', () => {
      const source = `
        import { PlayButton } from '@videojs/react';
        import styles from './styles';
        export default function Skin() {
          return (
            <div>
              <PlayButton className={styles.Primary} />
              <PlayButton className={styles.Secondary} />
            </div>
          );
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      // Should have 2 separate PlayButton entries in tree
      const playButtons = findAllInTree(
        usage.jsx!,
        el => el.identifier === 'PlayButton',
      );
      expect(playButtons).toHaveLength(2);

      // Each should be distinct (different AST nodes)
      expect(playButtons[0].node).toBeDefined();
      expect(playButtons[1].node).toBeDefined();
      expect(playButtons[0].node).not.toBe(playButtons[1].node);

      // Verify different classNames are tracked per instance
      const primaryButton = usage.classNames.find(
        cn => cn.component.identifier === 'PlayButton' && cn.type === 'member-expression' && cn.key === 'Primary',
      );
      const secondaryButton = usage.classNames.find(
        cn => cn.component.identifier === 'PlayButton' && cn.type === 'member-expression' && cn.key === 'Secondary',
      );

      expect(primaryButton).toBeDefined();
      expect(secondaryButton).toBeDefined();

      // Verify they reference different component instances
      expect(primaryButton!.component.node).not.toBe(secondaryButton!.component.node);
    });
  });

  describe('className Usage Extraction', () => {
    it('extracts member expression className usage', () => {
      const source = `
        import styles from './styles';
        export default function Skin() {
          return <div className={styles.Container} />;
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      expect(usage.classNames).toHaveLength(1);
      expect(usage.classNames[0]).toMatchObject({
        type: 'member-expression',
        identifier: 'styles',
        key: 'Container',
        component: { identifier: 'div' },
      });
      expect(usage.classNames[0].node).toBeDefined();
      expect(usage.classNames[0].component.node).toBeDefined();
    });

    it('extracts string literal className usage', () => {
      const source = `
        export default function Skin() {
          return <div className="button primary" />;
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      expect(usage.classNames).toHaveLength(1);
      expect(usage.classNames[0]).toMatchObject({
        type: 'string-literal',
        classes: ['button', 'primary'],
        literalValue: 'button primary',
        component: { identifier: 'div' },
      });
    });

    it('extracts mixed template literal with member expressions and strings', () => {
      const source = `
        import styles from './styles';
        export default function Skin() {
          return <div className={\`prefix \${styles.Container} middle \${styles.Button} suffix\`} />;
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      expect(usage.classNames).toHaveLength(3);

      // Member expressions
      const containerUsage = usage.classNames.find(
        u => u.type === 'member-expression' && u.key === 'Container',
      );
      expect(containerUsage).toBeDefined();

      const buttonUsage = usage.classNames.find(
        u => u.type === 'member-expression' && u.key === 'Button',
      );
      expect(buttonUsage).toBeDefined();

      // Clustered string literals
      const literalUsage = usage.classNames.find(
        u => u.type === 'string-literal',
      );
      expect(literalUsage).toBeDefined();
      if (literalUsage?.type === 'string-literal') {
        expect(literalUsage.classes).toEqual(['prefix', 'middle', 'suffix']);
      }
    });

    it('extracts multiple style keys from template literals', () => {
      const source = `
        import styles from './styles';
        export default function Skin() {
          return (
            <div className={\`\${styles.Container} \${styles.Layout}\`}>
              <button className={styles.Button} />
            </div>
          );
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      // 3 member expressions (Container, Layout, Button)
      const memberExpressions = usage.classNames.filter(
        u => u.type === 'member-expression',
      );
      expect(memberExpressions).toHaveLength(3);
      expect(memberExpressions.map(u => u.key)).toEqual(['Container', 'Layout', 'Button']);
      expect(memberExpressions.every(u => u.identifier === 'styles')).toBe(true);
    });

    it('captures component info for className on compound components', () => {
      const source = `
        import { TimeSlider } from '@videojs/react';
        import styles from './styles';
        export default function Skin() {
          return (
            <TimeSlider.Root className={styles.RangeRoot}>
              <TimeSlider.Track className={styles.RangeTrack} />
            </TimeSlider.Root>
          );
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      expect(usage.classNames).toHaveLength(2);

      const rootClassName = usage.classNames.find(
        u => u.type === 'member-expression' && u.key === 'RangeRoot',
      );
      expect(rootClassName).toMatchObject({
        type: 'member-expression',
        identifier: 'styles',
        key: 'RangeRoot',
        component: { identifier: 'TimeSlider', member: 'Root' },
      });
      expect(rootClassName?.component.node).toBeDefined();

      const trackClassName = usage.classNames.find(
        u => u.type === 'member-expression' && u.key === 'RangeTrack',
      );
      expect(trackClassName).toMatchObject({
        type: 'member-expression',
        identifier: 'styles',
        key: 'RangeTrack',
        component: { identifier: 'TimeSlider', member: 'Track' },
      });
      expect(trackClassName?.component.node).toBeDefined();
    });
  });

  describe('default export extraction', () => {
    it('extracts component name and marks root JSX element', () => {
      const source = `
        export default function MediaSkinSimple() {
          return <div>Content</div>;
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      expect(usage.defaultExport.componentName).toBe('MediaSkinSimple');
      expect(usage.defaultExport.node).toBeDefined();
      expect(usage.defaultExport.jsxElement).toBeDefined();

      // Root element is stored directly in jsx field
      expect(usage.jsx).toBeDefined();
      expect(usage.jsx!.identifier).toBe('div');
    });

    it('handles arrow function exports and marks root', () => {
      const source = `
        export default () => <div>Content</div>;
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      expect(usage.defaultExport.componentName).toBe('UnknownComponent');
      expect(usage.defaultExport.jsxElement).toBeDefined();

      // Root element is stored directly in jsx field
      expect(usage.jsx).toBeDefined();
      expect(usage.jsx!.identifier).toBe('div');
    });
  });

  describe('compound parent/ancestor relationships', () => {
    it('identifies compound parent for non-compound element', () => {
      const source = `
        import { Tooltip, PlayButton } from '@videojs/react';
        export default function Skin() {
          return (
            <Tooltip.Trigger>
              <PlayButton />
            </Tooltip.Trigger>
          );
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      // Root is Tooltip.Trigger, PlayButton is its child
      const tooltipTrigger = usage.jsx;
      expect(tooltipTrigger!.identifier).toBe('Tooltip');
      expect(tooltipTrigger!.member).toBe('Trigger');

      const playButton = findInTree(usage.jsx!, u => u.identifier === 'PlayButton');
      expect(playButton).toBeDefined();
      expect(playButton!.node).toBeDefined();
    });

    it('identifies compound ancestor for compound element with same identifier', () => {
      const source = `
        import { Tooltip } from '@videojs/react';
        export default function Skin() {
          return (
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Tooltip.Popup />
              </Tooltip.Trigger>
            </Tooltip.Root>
          );
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      // Root is Tooltip.Root
      const tooltipRoot = usage.jsx;
      expect(tooltipRoot!.identifier).toBe('Tooltip');
      expect(tooltipRoot!.member).toBe('Root');

      // Trigger is child of Root
      const tooltipTrigger = findInTree(
        usage.jsx!,
        u => u.identifier === 'Tooltip' && u.member === 'Trigger',
      );
      expect(tooltipTrigger).toBeDefined();

      // Popup is child of Trigger
      const tooltipPopup = findInTree(
        usage.jsx!,
        u => u.identifier === 'Tooltip' && u.member === 'Popup',
      );
      expect(tooltipPopup).toBeDefined();
    });

    it('skips different-identifier compounds when finding ancestor', () => {
      const source = `
        import { Tooltip, TimeSlider } from '@videojs/react';
        export default function Skin() {
          return (
            <TimeSlider.Root>
              <Tooltip.Trigger>
                <TimeSlider.Track />
              </Tooltip.Trigger>
            </TimeSlider.Root>
          );
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      // Root is TimeSlider.Root
      const timeSliderRoot = usage.jsx;
      expect(timeSliderRoot!.identifier).toBe('TimeSlider');
      expect(timeSliderRoot!.member).toBe('Root');

      // Track is nested under Tooltip.Trigger but still part of tree
      const timeSliderTrack = findInTree(
        usage.jsx!,
        u => u.identifier === 'TimeSlider' && u.member === 'Track',
      );
      expect(timeSliderTrack).toBeDefined();
    });

    it('handles non-compound elements with no compound parent', () => {
      const source = `
        import { PlayButton } from '@videojs/react';
        export default function Skin() {
          return (
            <div>
              <PlayButton />
            </div>
          );
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      // Root is div
      const div = usage.jsx;
      expect(div!.identifier).toBe('div');

      // PlayButton is child of div
      const playButton = findInTree(usage.jsx!, u => u.identifier === 'PlayButton');
      expect(playButton).toBeDefined();
    });

    it('handles compound root with no ancestor', () => {
      const source = `
        import { Tooltip } from '@videojs/react';
        export default function Skin() {
          return <Tooltip.Root />;
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      // Root is Tooltip.Root with no children
      const tooltipRoot = usage.jsx;
      expect(tooltipRoot!.identifier).toBe('Tooltip');
      expect(tooltipRoot!.member).toBe('Root');
      expect(tooltipRoot!.children).toHaveLength(0);
    });
  });

  describe('complete integration', () => {
    it('analyzes complete skin module', () => {
      const source = `
        import type { PropsWithChildren } from 'react';
        import { PlayButton } from '@videojs/react';
        import { PlayIcon, PauseIcon } from '@/icons';
        import styles from './styles';

        export default function MediaSkinSimple({ children }: PropsWithChildren) {
          return (
            <div className={styles.Container}>
              {children}
              <PlayButton className={styles.Button}>
                <PlayIcon />
                <PauseIcon />
              </PlayButton>
            </div>
          );
        }
      `;

      const usage = analyze(createInitialContext(source), defaultCompilerConfig);

      // Verify imports
      expect(usage.imports).toHaveLength(4);
      expect(usage.imports.map(i => i.source)).toEqual([
        'react',
        '@videojs/react',
        '@/icons',
        './styles',
      ]);

      // Verify JSX usage - collect all identifiers from tree
      const allElements = findAllInTree(usage.jsx!, () => true);
      const identifiers = allElements.map(u =>
        u.member ? `${u.identifier}.${u.member}` : u.identifier,
      ).sort();
      expect(identifiers).toEqual([
        'PauseIcon',
        'PlayButton',
        'PlayIcon',
        'div',
      ]);

      // Verify className usage (member expressions only)
      const memberExpressions = usage.classNames.filter(
        u => u.type === 'member-expression',
      );
      expect(memberExpressions).toHaveLength(2);
      expect(memberExpressions.map(u => u.key)).toEqual(['Container', 'Button']);

      // Verify default export
      expect(usage.defaultExport.componentName).toBe('MediaSkinSimple');
    });
  });
});
