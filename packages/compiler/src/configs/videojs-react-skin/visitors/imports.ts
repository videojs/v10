/**
 * ExtractImports Visitor
 *
 * Phase 1: Identification
 * Extracts all import statements with source, AST reference, and specifiers
 * No categorization or transformation - just facts
 */

import type { NodePath } from '@babel/traverse';
import type * as BabelTypes from '@babel/types';
import type { AnalysisVisitors } from '../../../phases/types';
import type { ImportUsage } from '../../types';

const importsVisitor: AnalysisVisitors = {
  ImportDeclaration: (
    prevImports: ImportUsage[] = [],
    path: NodePath<BabelTypes.ImportDeclaration>,
  ): ImportUsage[] => {
    const source = path.node.source.value;
    const specifiers = path.node.specifiers;

    const importUsage: ImportUsage = {
      source,
      node: path as any, // NodePath type compatible
      specifiers: {
        named: [],
      },
    };

    // Extract specifiers
    for (const spec of specifiers) {
      if (spec.type === 'ImportDefaultSpecifier') {
        importUsage.specifiers.default = spec.local.name;
      } else if (spec.type === 'ImportSpecifier') {
        importUsage.specifiers.named.push(spec.local.name);
      } else if (spec.type === 'ImportNamespaceSpecifier') {
        importUsage.specifiers.namespace = spec.local.name;
      }
    }

    return [...prevImports, importUsage];
  },
};

export default importsVisitor;
