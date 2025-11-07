/**
 * Structured Imports Projection (New Architecture)
 *
 * Phase 3: Projection
 * Projects categorized imports to structured output (ProjectedImportEntry[])
 * Returns pseudo-AST that preserves formatting information
 *
 * Key differences from project-imports.ts:
 * - Returns structured data (ProjectedImportEntry[]) instead of strings
 * - Single function instead of per-category projectors
 * - Accesses context.imports directly (decoupled from usage entities)
 * - Uses groupBy/filter for cleaner logic
 * - Inline comment/import additions
 */

import type { StateProjector } from '../../../phases/types';
import type { ProjectedImportEntry } from '../../../types';
import type { CategorizedImport } from '../../types';
import { componentNameToElementName } from '../../../utils/component-names';

type StyleImport = CategorizedImport & { category: 'style' };
type VJSComponentImport = CategorizedImport & { category: 'vjs-component' };
type VJSIconImport = CategorizedImport & { category: 'vjs-icon' };

/**
 * Project imports to structured output
 *
 * Transformation rules by category:
 * - vjs-core: Removed (base imports added separately)
 * - framework: Removed (React/PropsWithChildren not needed)
 * - style: Transform to CSS import with 'styles' default
 * - vjs-component: Each component → separate @/define/element-name side-effect import
 * - vjs-icon: All icons → single @/icons side-effect import (Many:1 deduplication)
 * - external: Preserved as-is
 *
 * Output structure:
 * 1. Base imports (MediaSkinElement, defineCustomElement)
 * 2. Style imports
 * 3. video-provider comment + import
 * 4. Component define imports (sorted)
 * 5. Icons import (if icons used)
 */
export const projectImports: StateProjector<ProjectedImportEntry[]> = (
  context,
  prevProjectionState,
  _config,
) => {
  const imports = context.imports ?? [];

  // Pre-filter imports by category for type safety
  const styleImports: StyleImport[] = imports
    .filter((i: CategorizedImport): i is StyleImport => i.category === 'style');
  const vjsComponentImports: VJSComponentImport[] = imports
    .filter((i: CategorizedImport): i is VJSComponentImport => i.category === 'vjs-component');
  const hasIconImports = imports
    .some((i: CategorizedImport): i is VJSIconImport => i.category === 'vjs-icon');

  return [
    // 1. Base framework imports (always first)
    // NOTE: If preferred, this could also simply be an import line string, i.e.:
    //  import { MediaSkinElement } from '@/media/media-skin';
    {
      type: 'import',
      source: '@/media/media-skin',
      specifiers: [{ type: 'named', name: 'MediaSkinElement' }],
    },
    {
      type: 'import' as const,
      source: '@/utils/custom-element',
      specifiers: [{ type: 'named', name: 'defineCustomElement' }],
    },
    // 2. Style imports (CSS)
    ...(styleImports
      .map((styleImport: StyleImport, i: number) => {
      // NOTE: We may want to abstract "validation" in a way that is less ad hoc. This would be an example of validation
      // that would be expected after phase 2 but before projectedImports is invoked in phase 3.
        if (i > 0) {
          console.warn(`Multiple imports identified as category ${styleImport.category}. Currently unsupported. Ignoring.`);
          return undefined;
        }

        const source = styleImport.source;
        const cssSource = source.endsWith('.ts') || source.endsWith('.tsx')
          ? source.replace(/\.tsx?$/, '.css')
          : `${source}.css`;

        return {
          type: 'import',
          source: cssSource,
          // NOTE: Here is an example of shared projection state. This is also currently used in `projectCSS()`
          specifiers: [{ type: 'default', name: prevProjectionState.styleVariableName }],
        };
      })
      .filter(Boolean)),
    // 3. video-provider block (should be imported before components or icons used)
    {
      type: 'comment',
      style: 'line',
      value: 'be sure to import video-provider first for proper context initialization',
    },
    {
      type: 'import',
      source: '@/define/video-provider',
      specifiers: [], // Side-effect import
    },
    // 4. Component define imports (sorted by element name)
    ...vjsComponentImports
      .flatMap((vjsComponentImport: VJSComponentImport): string[] => {
      // NOTE: We could refactor this to split the import path of the source instead of relying on the name (including variable name for defaults)
      // of the imported value here.
        if (vjsComponentImport.specifiers.default) {
          return [vjsComponentImport.specifiers.default];
        } else if (vjsComponentImport.specifiers.named.length) {
          return vjsComponentImport.specifiers.named;
        }

        // NOTE: We may want to abstract "validation" in a way that is less ad hoc. This would be an example of validation
        // that would be expected after phase 2 but before projectedImports is invoked in phase 3.
        console.warn(`VJS Component imports only support mappings for default or named imports but encountered something else. Ignoring.`);
        return [];
      })
      .sort() // sort by element name
      .map((componentName: string) => {
        const elementName = componentNameToElementName(componentName);
        return {
          type: 'import',
          source: `@/define/${elementName}`,
          specifiers: [], // Side-effect import
        };
      }),
    // 5. Icons import (if any icon usage)
    // Many:1 - all icon imports collapse to single side-effect import
    // NOTE: When we have disparate icon sets, this will likely need to be updated
    ...(hasIconImports
      ? [{
          type: 'import',
          source: '@/icons',
          specifiers: [], // Side-effect import
        }]
      : []
    ),
    // NOTE: There are currently defined categories that are not projected based on current skin needs:
    // - framework (would likely always be excluded, though there may be some mappings from react -> another framework, e.g. svelte)
    // - vjs-core (may need in the future. use above examples for reference)
    // - external (currently not used by react skins, though we may need to support this in the future)
  ] as ProjectedImportEntry[];
};
