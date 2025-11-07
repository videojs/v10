/**
 * Test Compilation Helper
 *
 * Wraps new pipeline to provide test-friendly result format
 * Exposes intermediate results (html, classNames, etc.) for detailed testing
 */

import { analyze, categorize, composeModule, defaultCompilerConfig, projectModule } from '../../src';
import { formatHTML } from '../../src/utils/formatters/html';
import { formatImports } from '../../src/utils/formatters/imports';
import { createInitialContext } from '../utils';

/**
 * Compile result for testing
 * Exposes intermediate pipeline results
 */
export interface TestCompileResult {
  /** Projected HTML (without module wrapper) */
  html: string;
  /** Extracted class names from analysis */
  classNames: string[];
  /** Complete compiled module */
  module: string;
  /** Module imports (formatted string with newlines) */
  imports: string;
  /** Removed imports (framework imports that were filtered out) */
  removedImports: string[];
  /** Component name from default export */
  componentName: string;
  /** Projected CSS content */
  css: string;
}

/**
 * Compile React skin for testing
 * Returns intermediate results for detailed assertions
 *
 * @param source - React skin source code
 * @returns Test-friendly compile result
 */
export function compileForTest(source: string): TestCompileResult {
  // Create initial context with default projection state
  const initialContext = createInitialContext(source);

  // Run through 3-phase pipeline
  const analyzedContext = analyze(initialContext, defaultCompilerConfig);
  const categorizedContext = categorize(
    { ...analyzedContext, projectionState: initialContext.projectionState },
    defaultCompilerConfig,
  );
  const projectedContext = projectModule(categorizedContext, defaultCompilerConfig);

  // Extract classNames from categorized context  // Apply same rules as resolveClassName: omit component-match, kebab-case generic-style
  // Use projectors to transform className keys (same logic as resolveClassName)
  const classNames = (categorizedContext.classNames ?? []).reduce<string[]>((acc, cn) => {
    const projector = defaultCompilerConfig.classNameProjectors[cn.category];
    if (!projector) {
      return acc;
    }
    return projector(acc, cn, categorizedContext);
  }, []);

  // Sort alphabetically for consistent output
  classNames.sort();

  // Track removed imports (framework imports that were filtered out)
  const removedImports: string[] = [];
  for (const imp of categorizedContext.imports ?? []) {
    if (imp.category === 'framework') {
      removedImports.push(imp.source);
    }
  }

  // Format imports and HTML for test output
  const imports = formatImports(projectedContext.projectionState.imports);
  const html = formatHTML(projectedContext.projectionState.html);

  return {
    html,
    classNames,
    module: composeModule(projectedContext.projectionState),
    imports,
    removedImports,
    componentName: categorizedContext.defaultExport.componentName,
    css: projectedContext.projectionState.css || '',
  };
}
