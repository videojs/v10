/**
 * Module Template Composer
 *
 * Phase 3: Projection
 * Composes projection context into complete HTML skin module
 * Uses template substitution with accumulated projection data
 */

import type { ProjectionState } from '../../types';
import { formatHTML } from '../../../utils/formatters/html';
import { formatImports } from '../../../utils/formatters/imports';

/**
 * Compose complete HTML skin module from projection state
 * Uses fixed template structure that matches HTML package skins
 * Handles final formatting (e.g., joining import lines)
 *
 * Expects complete projection state - all accumulator fields must be populated
 * This should be guaranteed by projectModule(), but runtime validation provides safety
 *
 * @param projection - Projection state (expected to be complete with all fields populated)
 * @returns Complete module source code
 */
export function composeModule(projection: ProjectionState): string {
  // Runtime validation - ensure all required fields are present
  if (!projection.imports || projection.imports.length === 0) {
    throw new Error('Projection incomplete: imports array is empty or undefined');
  }
  if (!projection.elementClassName) {
    throw new Error('Projection incomplete: elementClassName is missing');
  }
  if (!projection.elementName) {
    throw new Error('Projection incomplete: elementName is missing');
  }
  if (projection.html === undefined) {
    throw new Error('Projection incomplete: html is missing');
  }
  if (projection.css === undefined) {
    throw new Error('Projection incomplete: css is missing');
  }

  return `${formatImports(projection.imports)}

export function getTemplateHTML() {
  return /* html */\`
    \${MediaSkinElement.getTemplateHTML()}
    <style>${projection.css}</style>

    ${formatHTML(projection.html, { depth: 2, indentStyle: '  ' })}
  \`;
}

export class ${projection.elementClassName} extends MediaSkinElement {
  static getTemplateHTML: () => string = getTemplateHTML;
}

defineCustomElement('${projection.elementName}', ${projection.elementClassName});
`;
}
