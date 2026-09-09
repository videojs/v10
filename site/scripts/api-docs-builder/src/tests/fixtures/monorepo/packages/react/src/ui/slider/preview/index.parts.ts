/**
 * Nested parts index, exposed from slider/index.parts.ts as `export * as Preview`.
 *
 * Exercises: namespace part discovery.
 * - Root: nested part whose element file is named after the namespace (slider/preview.ts)
 * - Label: nested re-export of another component's React-only part (gauge/label.tsx)
 */

export { Label, type LabelProps } from '../../gauge/label';
export { SliderPreviewRoot as Root, type SliderPreviewRootProps as RootProps } from './root';
