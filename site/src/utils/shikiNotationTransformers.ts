import {
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationWordHighlight,
} from '@shikijs/transformers';
import type { ShikiTransformer } from 'shiki';

export const shikiNotationTransformers: ShikiTransformer[] = [
  transformerNotationDiff({ matchAlgorithm: 'v3' }),
  transformerNotationFocus({ matchAlgorithm: 'v3' }),
  transformerNotationWordHighlight({ matchAlgorithm: 'v3' }),
];
