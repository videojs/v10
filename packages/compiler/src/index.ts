/**
 * @videojs/compiler
 *
 * Compile React components to web components
 * 3-phase pipeline: Analysis → Categorization → Projection
 *
 * TYPES: No types are re-exported from this module. Import types directly from:
 * - Generic types: './types'
 * - Phase types: './phases/types'
 * - Config types: './configs/types'
 */

// Main compiler entry point
export { compile } from './compile';

// Configuration (videojs-react-skin)
export { defaultCompilerConfig, videoJSReactSkinConfig } from './configs/videojs-react-skin';

// Phase 3: Module Composition (config-specific)
export { composeModule } from './configs/videojs-react-skin/outputs';

// Phase 1: Analysis
export { analyze } from './phases/analyze';

// Phase 2: Categorization
export { categorize } from './phases/categorize';

// Phase 3: Projection
export { project, projectModule } from './phases/project';
