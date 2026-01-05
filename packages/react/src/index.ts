'use client';

// Media elements
export { Video } from './media/video';
export type { VideoProps } from './media/video';

// Utilities
export { composeRefs, useComposedRefs } from './utils/use-composed-refs';

// Re-export from @videojs/store/react for convenience
export { createStore, useStoreContext } from '@videojs/store/react';
export type { CreateStoreConfig, CreateStoreResult, ProviderProps } from '@videojs/store/react';

// Re-export base hooks for advanced use
export { useRequest, useSelector, useTasks } from '@videojs/store/react';
