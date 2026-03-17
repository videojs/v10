import { SKINS } from '@app/constants';
import type { SourceId } from '@app/shared/sources';
import { SOURCE_IDS } from '@app/shared/sources';
import type { Skin } from '@app/types';
import { createSharedStore } from './create-shared-store';

export const skinStore = createSharedStore<Skin>('skin', 'default');
export const sourceStore = createSharedStore<SourceId>('source', 'hls-1');

const params = new URLSearchParams(window.location.search);
const skinParam = params.get('skin');
const sourceParam = params.get('source');

if (skinParam && SKINS.includes(skinParam as Skin)) {
  skinStore.setValue(skinParam as Skin);
}

if (sourceParam && SOURCE_IDS.includes(sourceParam as SourceId)) {
  sourceStore.setValue(sourceParam as SourceId);
}
