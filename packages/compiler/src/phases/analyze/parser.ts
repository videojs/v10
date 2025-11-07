/**
 * Analysis Parser
 *
 * Phase 1: Identification
 * Parse source with analysis visitors - separate from transformation pipeline
 */

import type { Visitor } from '@babel/traverse';
import type {
  AnyAnalysisVisitorHandler,
  SourceContext,
  VisitorEntriesToContext,
  VisitorEntry,
} from '../types';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = (traverseModule as any).default || traverseModule;

/**
 * Parse source with analysis visitors
 * Threads input context through and enriches with analyzed fields
 * Parsing infrastructure (source, ast, t) are local variables only
 *
 * The return type is inferred from the visitor entries:
 * each entry's contextKey becomes a field with the visitor's value type
 */
export function parseForAnalysis<
  TInput extends SourceContext,
  TEntries extends ReadonlyArray<VisitorEntry<any, any>>,
>(
  context: TInput,
  visitorEntries: TEntries,
): TInput & VisitorEntriesToContext<TEntries> {
  // Extract source and parse (local variables only)
  const source = context.input.source;
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  // Start with input context as accumulator
  let analysisContext = context;

  // Build Babel visitor that updates context
  const babelVisitor = buildAnalysisVisitor(
    visitorEntries,
    () => analysisContext,
    (updates) => {
      analysisContext = { ...analysisContext, ...updates };
    },
  );

  // Traverse AST with visitor
  traverse(ast, babelVisitor);

  return analysisContext as TInput & VisitorEntriesToContext<TEntries>;
}

/**
 * Build Babel visitor from analysis visitors
 * Each visitor receives previous value and path, returns updated value
 */
function buildAnalysisVisitor<TContext extends Record<string, any>>(
  visitorEntries: ReadonlyArray<VisitorEntry<any, any>>,
  getContext: () => TContext,
  updateContext: (updates: Partial<TContext>) => void,
): Visitor {
  const babelVisitor: Record<string, any> = {};

  for (const { contextKey, visitor: visitorMap } of visitorEntries) {
    for (const [key, handler] of Object.entries(visitorMap as Record<string, AnyAnalysisVisitorHandler>)) {
      if (!handler) continue;

      // Handle array of handlers
      const handlers = Array.isArray(handler) ? handler : [handler];

      for (const h of handlers) {
        const existing = babelVisitor[key];
        babelVisitor[key] = (path: any) => {
          if (existing) existing(path);
          const context = getContext();
          const previousValue = (context as any)[contextKey];
          const newValue = h(previousValue, path);
          updateContext({ [contextKey]: newValue } as Partial<TContext>);
        };
      }
    }
  }

  return babelVisitor as Visitor;
}
