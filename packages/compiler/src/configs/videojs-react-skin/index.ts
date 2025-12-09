/**
 * Videojs React Skin Configuration
 *
 * Complete compiler configuration for compiling @videojs/react skins
 * to vanilla web components.
 *
 * This is a use-case-specific configuration, not generic infrastructure.
 * For other component libraries or output formats, create a new config.
 *
 * TYPES: No types are re-exported from this module. Import types directly from:
 * - Config-specific types: '../types'
 * - Phase types: '../../phases/types'
 * - Generic types: '../../types'
 */

// Complete compiler configuration for @videojs/react skins
export { videoJSReactSkinConfig } from './config';
// Alias for backward compatibility (this is currently the only/default config)
export { videoJSReactSkinConfig as defaultCompilerConfig } from './config';

export * from './outputs';
export * from './predicates';
export * from './projectors';
export * from './visitors';
