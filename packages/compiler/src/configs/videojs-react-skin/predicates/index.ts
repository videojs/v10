/**
 * Videojs React Skin - Categorization Predicates
 *
 * Phase 2 predicates for @videojs/react skin compilation
 * Categorizes usage patterns specific to @videojs/react components
 */

export {
  isClassNameComponentMatch,
  isClassNameGenericStyle,
  isClassNameLiteral,
} from './class-names';

export {
  isReactFunctionalComponent,
} from './default-export';

export {
  isImportFromFrameworkPackage,
  isImportFromVJSCore,
  isImportFromVJSPackage,
  isImportUsedAsComponent,
  isImportUsedAsIcon,
  isImportUsedAsStyle,
} from './imports';

export {
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
} from './jsx';
