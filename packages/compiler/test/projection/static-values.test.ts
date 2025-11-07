import type { CompilerConfig } from '../../src/configs/types';
import { describe, expect, it } from 'vitest';
import { analyze, categorize, defaultCompilerConfig, projectModule } from '../../src';
import { createInitialContext } from '../utils';

describe('projection State Static Values', () => {
  it('supports static values in projectionState config', () => {
    const source = `
      import { PlayButton } from '@videojs/react';
      export default function TestSkin() {
        return <PlayButton />;
      }
    `;

    const context = createInitialContext(source);
    const analyzedContext = analyze(context, defaultCompilerConfig);
    const categorizedContext = categorize(
      { ...analyzedContext, projectionState: context.projectionState },
      defaultCompilerConfig,
    );

    // Create custom config with a static CSS value
    const customConfig: CompilerConfig = {
      ...defaultCompilerConfig,
      projectionState: {
        ...defaultCompilerConfig.projectionState,
        css: 'static-styles-value', // Static value instead of function
      },
    };

    const result = projectModule(categorizedContext, customConfig);

    // Verify static value was applied
    expect(result.projectionState.css).toBe('static-styles-value');
  });

  it('supports mixing static values and functions', () => {
    const source = `
      import { PlayButton } from '@videojs/react';
      export default function TestSkin() {
        return <PlayButton />;
      }
    `;

    const context = createInitialContext(source);
    const analyzedContext = analyze(context, defaultCompilerConfig);
    const categorizedContext = categorize(
      { ...analyzedContext, projectionState: context.projectionState },
      defaultCompilerConfig,
    );

    // Mix static values and functions
    const customConfig: CompilerConfig = {
      ...defaultCompilerConfig,
      projectionState: {
        ...defaultCompilerConfig.projectionState,
        css: 'static-css', // Static
        elementClassName: 'StaticElement', // Static
        elementName: 'static-element', // Static
        // imports and html remain as functions
      },
    };

    const result = projectModule(categorizedContext, customConfig);

    // Verify static values were applied
    expect(result.projectionState.css).toBe('static-css');
    expect(result.projectionState.elementClassName).toBe('StaticElement');
    expect(result.projectionState.elementName).toBe('static-element');

    // Verify functions still work
    expect(result.projectionState.imports).toBeDefined();
    expect(result.projectionState.imports?.length).toBeGreaterThan(0);
    expect(result.projectionState.html).toBeDefined();
  });
});
