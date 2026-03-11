import type { SourceId } from '@app/shared/sources';
import type { Skin } from '@app/types';
import { createWebStorageStore } from './create-web-storage-store';

export const skinStore = createWebStorageStore<Skin>('local', 'skin', 'default');
export const sourceStore = createWebStorageStore<SourceId>('local', 'source', 'hls-1');
