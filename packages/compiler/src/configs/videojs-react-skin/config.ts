/**
 * Video.js React Skin Compiler Configuration
 *
 * Complete compiler configuration for transforming React skins to HTML skins
 * Defines processing rules (visitors, categorizers, projectors) for each concern
 * Grouped by concern (imports, classNames, jsx, defaultExport)
 */

import type { CompilerConfig } from '../types';
import { composeModule } from './outputs';
import {
  isClassNameComponentMatch,
  isClassNameGenericStyle,
  isClassNameLiteral,
  isImportFromFrameworkPackage,
  isImportFromVJSCore,
  isImportFromVJSPackage,
  isImportUsedAsComponent,
  isImportUsedAsIcon,
  isImportUsedAsStyle,
  isJSXElementCompoundRoot,
  isJSXElementMediaContainer,
  isJSXElementNative,
  isJSXElementPopoverPopup,
  isJSXElementPopoverPortal,
  isJSXElementPopoverPositioner,
  isJSXElementPopoverRoot,
  isJSXElementPopoverTrigger,
  isJSXElementTooltipPopup,
  isJSXElementTooltipPortal,
  isJSXElementTooltipPositioner,
  isJSXElementTooltipRoot,
  isJSXElementTooltipTrigger,
  isReactFunctionalComponent,
} from './predicates';
import {
  projectComponentMatch,
  projectCSS,
  projectElementClassName,
  projectElementName,
  projectGenericStyle,
  projectHTML,
  projectImports,
  projectLiteralClasses,
} from './projectors';
import {
  classNamesVisitor,
  defaultExportVisitor,
  importsVisitor,
  jsxVisitor,
} from './visitors';

/**
 * Video.js React Skin compiler configuration
 * Defines HOW to process each concern through the 3-phase pipeline
 *
 * Structure:
 * - phases: Analysis (Phase 1) and categorization (Phase 2) for each concern
 * - classNameProjectors: Element-level class resolution (Phase 3, invoked inline)
 * - projectionState: Module-level projection (Phase 3, state-based)
 */
export const videoJSReactSkinConfig: CompilerConfig = {
  phases: {
    imports: {
      // Phase 1: Analysis visitor
      visitor: importsVisitor,

      // Phase 2: Categorization predicates (order matters, first match wins)
      categories: {
        style: [isImportUsedAsStyle],
        framework: [isImportFromFrameworkPackage],
        'vjs-core': [isImportFromVJSCore],
        'vjs-icon': [isImportUsedAsIcon, isImportFromVJSPackage],
        'vjs-component': [isImportUsedAsComponent, isImportFromVJSPackage],
        external: [], // Fallback
      },
    },

    classNames: {
      // Phase 1: Analysis visitor
      visitor: classNamesVisitor,

      // Phase 2: Categorization predicates (order matters, first match wins)
      categories: {
        'literal-classes': [isClassNameLiteral],
        'component-match': [isClassNameComponentMatch],
        'generic-style': [isClassNameGenericStyle],
      },
    },

    jsx: {
      // Phase 1: Analysis visitor
      visitor: jsxVisitor,

      // Phase 2: Categorization predicates (order matters, first match wins)
      categories: {
        'native-element': [isJSXElementNative],
        'media-container': [isJSXElementMediaContainer],
        'tooltip-root': [isJSXElementTooltipRoot],
        'tooltip-trigger': [isJSXElementTooltipTrigger],
        'tooltip-positioner': [isJSXElementTooltipPositioner],
        'tooltip-popup': [isJSXElementTooltipPopup],
        'tooltip-portal': [isJSXElementTooltipPortal],
        'popover-root': [isJSXElementPopoverRoot],
        'popover-trigger': [isJSXElementPopoverTrigger],
        'popover-positioner': [isJSXElementPopoverPositioner],
        'popover-popup': [isJSXElementPopoverPopup],
        'popover-portal': [isJSXElementPopoverPortal],
        'compound-root': [isJSXElementCompoundRoot],
        'generic-component': [],
      },
    },

    defaultExport: {
      // Phase 1: Analysis visitor
      visitor: defaultExportVisitor,

      // Phase 2: Categorization predicates
      categories: {
        'react-functional-component': [isReactFunctionalComponent],
      },
    },
  },

  /**
   * className projectors (element-level, Phase 3)
   * Invoked inline during HTML projection to resolve class attributes
   */
  classNameProjectors: {
    'literal-classes': projectLiteralClasses,
    'component-match': projectComponentMatch,
    'generic-style': projectGenericStyle,
  },

  /**
   * State-based projectors (module-level, Phase 3)
   * Type-safe projectors that populate ProjectionState fields
   */
  projectionState: {
    /** Style variable name convention (static value) */
    styleVariableName: 'styles',
    /** Structured imports projector - returns ProjectedImportEntry[] */
    imports: projectImports,
    /** Element class name projector - returns string */
    elementClassName: projectElementClassName,
    /** Element tag name projector - returns string */
    elementName: projectElementName,
    /** CSS template reference projector - returns string */
    css: projectCSS,
    /** HTML structure projector - returns ProjectedHTML[] */
    html: projectHTML,
  },

  /**
   * Module composition (final output generation, Phase 3)
   * Composes complete projection state into final module source code
   */
  composeModule,
};
