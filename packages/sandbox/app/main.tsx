import type { SourceId } from '@app/shared/sources';
import '@app/styles.css';
import { App } from '@app/shell/app';
import type { Skin } from '@app/types';
import { skinStore, sourceStore } from '@app/utils/stores';
import { createRoot } from 'react-dom/client';

// Sync query-param overrides to localStorage BEFORE React mounts,
// so useWebStorage hooks pick up the correct initial values.
const params = new URLSearchParams(location.search);
const skinParam = params.get('skin') as Skin | null;
if (skinParam) skinStore.setValue(skinParam);
const sourceParam = params.get('source') as SourceId | null;
if (sourceParam) sourceStore.setValue(sourceParam);

createRoot(document.getElementById('root')!).render(<App />);
