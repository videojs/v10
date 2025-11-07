/**
 * JSX Element Categorization Tests
 *
 * Tests Phase 2: JSX element categorization
 * Verifies JSX elements are correctly categorized and pattern metadata linked
 */

import type { CategorizedJSXUsage } from '../../src/configs/types';
import { describe, expect, it } from 'vitest';
import { defaultCompilerConfig } from '../../src/configs/videojs-react-skin';
import { analyze } from '../../src/phases/analyze';
import { categorize } from '../../src/phases/categorize';
import { createInitialContext } from '../utils';

// Helper function for tree traversal
function findInTree(root: CategorizedJSXUsage, predicate: (el: CategorizedJSXUsage) => boolean): CategorizedJSXUsage | undefined {
  if (predicate(root)) return root;
  for (const child of root.children) {
    if ('category' in child) {
      // Only recurse into categorized JSXUsage elements
      const found = findInTree(child, predicate);
      if (found) return found;
    }
  }
  return undefined;
}

describe('jSX element categorization', () => {
  it('categorizes native HTML elements', () => {
    const source = `
      export default function Skin() {
        return (
          <div>
            <button>Click</button>
            <span>Text</span>
          </div>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const divElement = result.jsx;
    const buttonElement = findInTree(result.jsx, el => el.identifier === 'button');
    const spanElement = findInTree(result.jsx, el => el.identifier === 'span');

    expect(divElement?.category).toBe('native-element');
    expect(buttonElement?.category).toBe('native-element');
    expect(spanElement?.category).toBe('native-element');
  });

  it('categorizes MediaContainer', () => {
    const source = `
      import { MediaContainer } from '@videojs/react';
      export default function Skin() {
        return <MediaContainer />;
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const mediaContainer = result.jsx;

    expect(mediaContainer?.category).toBe('media-container');
  });

  it('categorizes compound component roots', () => {
    const source = `
      import { TimeSlider } from '@videojs/react';
      export default function Skin() {
        return (
          <TimeSlider>
            <TimeSlider.Root />
          </TimeSlider>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const timeSliderRoot = result.jsx;

    expect(timeSliderRoot?.category).toBe('compound-root');
    expect(timeSliderRoot?.identifier).toBe('TimeSlider');
    expect(timeSliderRoot?.member).toBeUndefined();
  });

  it('categorizes generic components', () => {
    const source = `
      import { PlayButton } from '@videojs/react';
      export default function Skin() {
        return <PlayButton />;
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const playButton = result.jsx;

    expect(playButton?.category).toBe('generic-component');
  });

  it('categorizes Tooltip.Root', () => {
    const source = `
      import { Tooltip } from '@videojs/react';
      export default function Skin() {
        return <Tooltip.Root />;
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const tooltipRoot = result.jsx;

    expect(tooltipRoot?.category).toBe('tooltip-root');
    expect(tooltipRoot?.identifier).toBe('Tooltip');
    expect(tooltipRoot?.member).toBe('Root');
  });

  it('categorizes Tooltip.Trigger with compound ancestor', () => {
    const source = `
      import { Tooltip } from '@videojs/react';
      export default function Skin() {
        return (
          <Tooltip.Root>
            <Tooltip.Trigger />
          </Tooltip.Root>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const tooltipRoot = result.jsx;
    const tooltipTrigger = findInTree(
      result.jsx,
      el => el.identifier === 'Tooltip' && el.member === 'Trigger',
    );

    expect(tooltipRoot?.category).toBe('tooltip-root');
    expect(tooltipTrigger?.category).toBe('tooltip-trigger');
  });

  it('categorizes Tooltip.Positioner', () => {
    const source = `
      import { Tooltip } from '@videojs/react';
      export default function Skin() {
        return (
          <Tooltip.Root>
            <Tooltip.Positioner />
          </Tooltip.Root>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const tooltipPositioner = findInTree(
      result.jsx,
      el => el.identifier === 'Tooltip' && el.member === 'Positioner',
    );

    expect(tooltipPositioner?.category).toBe('tooltip-positioner');
  });

  it('categorizes Tooltip.Popup', () => {
    const source = `
      import { Tooltip } from '@videojs/react';
      export default function Skin() {
        return (
          <Tooltip.Root>
            <Tooltip.Popup />
          </Tooltip.Root>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const tooltipPopup = findInTree(
      result.jsx,
      el => el.identifier === 'Tooltip' && el.member === 'Popup',
    );

    expect(tooltipPopup?.category).toBe('tooltip-popup');
  });

  it('categorizes complete Tooltip pattern with relationships', () => {
    const source = `
      import { Tooltip, PlayButton } from '@videojs/react';
      export default function Skin() {
        return (
          <Tooltip.Root>
            <Tooltip.Trigger>
              <PlayButton />
            </Tooltip.Trigger>
            <Tooltip.Positioner>
              <Tooltip.Popup>Play</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Root>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const tooltipRoot = result.jsx;
    const tooltipTrigger = findInTree(
      result.jsx,
      el => el.identifier === 'Tooltip' && el.member === 'Trigger',
    );
    const tooltipPositioner = findInTree(
      result.jsx,
      el => el.identifier === 'Tooltip' && el.member === 'Positioner',
    );
    const tooltipPopup = findInTree(
      result.jsx,
      el => el.identifier === 'Tooltip' && el.member === 'Popup',
    );
    const playButton = findInTree(
      result.jsx,
      el => el.identifier === 'PlayButton',
    );

    // Categories
    expect(tooltipRoot?.category).toBe('tooltip-root');
    expect(tooltipTrigger?.category).toBe('tooltip-trigger');
    expect(tooltipPositioner?.category).toBe('tooltip-positioner');
    expect(tooltipPopup?.category).toBe('tooltip-popup');
    expect(playButton?.category).toBe('generic-component');
  });

  it('categorizes Popover.Root', () => {
    const source = `
      import { Popover } from '@videojs/react';
      export default function Skin() {
        return <Popover.Root />;
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const popoverRoot = result.jsx;

    expect(popoverRoot?.category).toBe('popover-root');
  });

  it('categorizes Popover.Trigger with compound ancestor', () => {
    const source = `
      import { Popover } from '@videojs/react';
      export default function Skin() {
        return (
          <Popover.Root>
            <Popover.Trigger />
          </Popover.Root>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const popoverRoot = result.jsx;
    const popoverTrigger = findInTree(
      result.jsx,
      el => el.identifier === 'Popover' && el.member === 'Trigger',
    );

    expect(popoverRoot?.category).toBe('popover-root');
    expect(popoverTrigger?.category).toBe('popover-trigger');
  });

  it('categorizes complete Popover pattern with relationships', () => {
    const source = `
      import { Popover, MuteButton } from '@videojs/react';
      export default function Skin() {
        return (
          <Popover.Root>
            <Popover.Trigger>
              <MuteButton />
            </Popover.Trigger>
            <Popover.Positioner>
              <Popover.Popup>Volume Controls</Popover.Popup>
            </Popover.Positioner>
          </Popover.Root>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    const popoverRoot = result.jsx;
    const popoverTrigger = findInTree(
      result.jsx,
      el => el.identifier === 'Popover' && el.member === 'Trigger',
    );
    const popoverPositioner = findInTree(
      result.jsx,
      el => el.identifier === 'Popover' && el.member === 'Positioner',
    );
    const popoverPopup = findInTree(
      result.jsx,
      el => el.identifier === 'Popover' && el.member === 'Popup',
    );
    const muteButton = findInTree(
      result.jsx,
      el => el.identifier === 'MuteButton',
    );

    // Categories
    expect(popoverRoot?.category).toBe('popover-root');
    expect(popoverTrigger?.category).toBe('popover-trigger');
    expect(popoverPositioner?.category).toBe('popover-positioner');
    expect(popoverPopup?.category).toBe('popover-popup');
    expect(muteButton?.category).toBe('generic-component');
  });

  it('categorizes mixed component types', () => {
    const source = `
      import { Tooltip, PlayButton, TimeSlider, MediaContainer } from '@videojs/react';
      export default function Skin() {
        return (
          <MediaContainer>
            <TimeSlider>
              <TimeSlider.Root />
            </TimeSlider>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <PlayButton />
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Popup>Play</Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Root>
          </MediaContainer>
        );
      }
    `;

    const usage = analyze(createInitialContext(source), defaultCompilerConfig);
    const result = categorize(usage, defaultCompilerConfig);

    // Check MediaContainer (root)
    const mediaContainer = result.jsx;
    expect(mediaContainer?.category).toBe('media-container');

    // Check TimeSlider (compound root)
    const timeSlider = findInTree(
      result.jsx,
      el => el.identifier === 'TimeSlider' && !el.member,
    );
    expect(timeSlider?.category).toBe('compound-root');

    // Check Tooltip pattern
    const tooltipRoot = findInTree(
      result.jsx,
      el => el.identifier === 'Tooltip' && el.member === 'Root',
    );
    expect(tooltipRoot?.category).toBe('tooltip-root');

    // Check PlayButton (generic component)
    const playButton = findInTree(result.jsx, el => el.identifier === 'PlayButton');
    expect(playButton?.category).toBe('generic-component');
  });
});
