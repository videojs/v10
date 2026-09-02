import { createSkinsSourceConfig } from '../../packages/skins/build/vite.ts';
import { createSandboxConfig } from './vite.config.ts';

// The sandbox as it runs inside the workspace: the task config plus the skins' Vite preset, which compiles authored
// skins on request from `packages/skins/src`. The `dev` and `build` tasks name this file once `packages/skins` exists;
// Vite+ never loads it while scheduling, so the compiler's absence on a bare checkout cannot break the task graph. The
// file ships with the StackBlitz template but is never loaded there.
export default createSandboxConfig(createSkinsSourceConfig({ tailwind: true, frameworks: 'package' }));
