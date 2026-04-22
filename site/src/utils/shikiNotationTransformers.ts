import {
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationWordHighlight,
} from '@shikijs/transformers';
import type { ShikiTransformer } from 'shiki';

export const shikiNotationTransformers: ShikiTransformer[] = [
  transformerNotationDiff(),
  transformerNotationFocus(),
  transformerNotationWordHighlight(),
];
