/**
 * Import Formatting Utilities
 *
 * Converts structured ProjectedImportEntry data to formatted import strings
 * Pure formatting layer - no business logic
 */

import type { ProjectedImportEntry } from '../../types';

/**
 * Format a single ProjectedImportEntry to string
 * Handles structured imports, comments, and raw strings
 *
 * @param entry - Import entry to format
 * @returns Formatted import/comment string
 */
export function formatImportEntry(entry: ProjectedImportEntry): string {
  // Handle raw string (backwards compatibility)
  if (typeof entry === 'string') {
    return entry;
  }

  // Handle comment
  if (entry.type === 'comment') {
    if (entry.style === 'line') {
      const value = typeof entry.value === 'string' ? entry.value : entry.value.join('\n// ');
      return `// ${value}`;
    } else {
      // Block comment
      const lines = typeof entry.value === 'string' ? [entry.value] : entry.value;
      return `/*\n${lines.map(l => ` * ${l}`).join('\n')}\n */`;
    }
  }

  // Handle import
  if (!entry.specifiers || entry.specifiers.length === 0) {
    // Side-effect import: import '@/define/video-provider';
    return `import '${entry.source}';`;
  }

  // Build specifier list
  const specs = entry.specifiers.map((s) => {
    if (s.type === 'default') {
      // Default import
      return s.name;
    }
    if (s.type === 'namespace') {
      // Namespace import: * as name
      return `* as ${s.name}`;
    }
    // Named import (with optional alias)
    return s.alias ? `${s.name} as ${s.alias}` : s.name;
  });

  // Check if only default import (no braces)
  if (specs.length === 1 && entry.specifiers[0]?.type === 'default') {
    return `import ${specs[0]} from '${entry.source}';`;
  }

  // Named/mixed imports (with braces)
  return `import { ${specs.join(', ')} } from '${entry.source}';`;
}

/**
 * Format array of ProjectedImportEntry to final import string
 * Converts structured entries to strings and joins with newlines
 *
 * @param entries - Import entries to format
 * @returns Formatted imports joined with newlines
 */
export function formatImports(entries: ProjectedImportEntry[]): string {
  return entries.map(formatImportEntry).join('\n');
}
