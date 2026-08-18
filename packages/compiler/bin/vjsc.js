#!/usr/bin/env node

// Keep this launcher available so package managers can link it before the compiler builds.
await import('../dist/cli.js');
