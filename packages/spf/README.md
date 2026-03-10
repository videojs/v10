# @videojs/spf

Stream Processing Framework for Video.js 10

## Overview

SPF is a lightweight, bundle-size-optimized HLS playback engine for Video.js 10.

**Target:** < 20KB (minified + gzipped)  
**Target Date:** February 27, 2026  
**Status:** Active development

## V1 Feature Set

- CMAF HLS VOD playback
- Basic ABR (EWMA throughput)
- WebVTT captions
- MSE + MMS support
- Chrome, Safari, Firefox, Edge (latest)

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Typecheck
pnpm typecheck
```

## Documentation

See `.claude/spf-breakdown/` for:
- Complete work breakdown (58 issues)
- Architecture decisions
- Implementation timeline

## Reference

Spike code available in `.archive/spf-xstate-poc/` for pattern reference.

## GitHub Issues

- Epics: #384, #385, #386, #387
- All issues: https://github.com/videojs/v10/issues?q=is:issue+label:spf
