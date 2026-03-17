import type { SourceId } from '@app/shared/sources';
import type { Skin } from '@app/types';
import { createSharedStore } from './create-shared-store';

export const skinStore = createSharedStore<Skin>('skin', 'default');
export const sourceStore = createSharedStore<SourceId>('source', 'hls-1');

const params = new URLSearchParams(window.location.search);
const skinParam = params.get('skin') as Skin | null;
const sourceParam = params.get('source') as SourceId | null;

if (skinParam) skinStore.initialize(skinParam);
if (sourceParam) sourceStore.initialize(sourceParam);
