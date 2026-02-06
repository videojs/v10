/**
 * Re-export types from the shared schema.
 * The shared schema in src/types/api-reference.ts is the single source of truth.
 */
export type {
  ComponentApiReference,
  DataAttrDef,
  PropDef,
  StateDef,
} from '../../../src/types/api-reference.js';

export { ComponentApiReferenceSchema } from '../../../src/types/api-reference.js';

/**
 * Source file locations for a component across packages.
 */
export interface ComponentSource {
  /** PascalCase component name (e.g., PlayButton) */
  name: string;
  /** Path to core file (e.g., packages/core/src/core/ui/play-button/play-button-core.ts) */
  corePath?: string;
  /** Path to data attrs file */
  dataAttrsPath?: string;
  /** Path to HTML element file */
  htmlPath?: string;
}

/**
 * Extracted property from TypeScript analysis.
 */
export interface ExtractedProp {
  name: string;
  type: string;
  shortType?: string;
  description?: string;
  default?: string;
  required?: boolean;
}

/**
 * Extraction result from core package.
 */
export interface CoreExtraction {
  description?: string;
  props: ExtractedProp[];
  state: ExtractedProp[];
  defaultProps: Record<string, string>;
}

/**
 * Extraction result from data attributes file.
 */
export interface DataAttrsExtraction {
  attrs: Array<{ name: string; description: string }>;
}

export interface HtmlExtraction {
  tagName: string;
}
