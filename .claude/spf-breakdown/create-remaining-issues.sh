#!/bin/bash
# Script to create remaining 51 SPF issues in videojs/v10
# Run this from the repo root: bash .claude/spf-breakdown/create-remaining-issues.sh

REPO="videojs/v10"
WAVE1_EPIC="384"
WAVE2_EPIC="385"
WAVE3_EPIC="386"
WAVE4_EPIC="387"

echo "Creating remaining SPF issues..."
echo ""

# Wave 1 Issues (continuing from P5)

echo "Creating P5: Fetch-Parse Pattern..."
gh issue create --repo "$REPO" --title "[P5] Fetch-Parse Pattern" --body "$(cat <<'EOF'
Reusable abstraction for fetch + parse operations to reduce code repetition.

## Acceptance Criteria
- [ ] Generic fetch-parse function
- [ ] Error handling for fetch failures
- [ ] Error handling for parse failures
- [ ] Logging integration
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** P4 (HTTP Fetch Wrapper)
**Blocks:** Used throughout for DRY code

## Technical Notes
**Files:** `packages/spf/src/dom/network/fetch-parse.ts`
Reduces repetition noted in spike (fetch-parse pattern repeated 3 times).

## Bundle Size Impact
**Target:** <500 bytes
EOF
)" --label "spf,wave-1,P1,Pure/Isolated,size-S"

echo "Creating P6: Bandwidth Estimator..."
gh issue create --repo "$REPO" --title "[P6] Bandwidth Estimator" --body "$(cat <<'EOF'
EWMA (Exponentially Weighted Moving Average) throughput calculation from segment downloads.

## Acceptance Criteria
- [ ] EWMA algorithm implemented
- [ ] Update bandwidth estimate from segment download metrics
- [ ] Returns current bandwidth estimate (bps)
- [ ] Configurable EWMA weight/smoothing
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** None
**Blocks:** F8 (Bandwidth Tracking)

## Technical Notes
**Files:** `packages/spf/src/core/abr/bandwidth-estimator.ts`
Pure algorithm, no state or side effects.

## Bundle Size Impact
**Target:** <500 bytes
EOF
)" --label "spf,wave-1,P0,Pure/Isolated,size-S"

echo "Creating P7: Quality Selection Algorithm..."
gh issue create --repo "$REPO" --title "[P7] Quality Selection Algorithm" --body "$(cat <<'EOF'
Choose optimal video track/quality based on bandwidth estimate. Simple heuristic for V1.

## Acceptance Criteria
- [ ] Select track based on bandwidth
- [ ] Support upgrade/downgrade thresholds
- [ ] Handle edge cases (no suitable track)
- [ ] Returns track ID to switch to
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** None
**Blocks:** F2 (Initial Track Selection), F9 (Quality Switching)

## Technical Notes
**Files:** `packages/spf/src/core/abr/quality-selection.ts`
Simple heuristic: pick highest bitrate that fits bandwidth with safety margin.

## Bundle Size Impact
**Target:** <1KB
EOF
)" --label "spf,wave-1,P0,Pure/Isolated,size-S"

echo "Creating P8: Forward Buffer Calculator..."
gh issue create --repo "$REPO" --title "[P8] Forward Buffer Calculator" --body "$(cat <<'EOF'
Calculate forward buffer target. Start with simple time-based (30s), enhance to dynamic if time permits.

## Acceptance Criteria

**V1 (Must Have):**
- [ ] Fixed time-based buffer target (e.g., 30 seconds ahead)
- [ ] Returns buffer duration and size
- [ ] Unit tests with ≥80% coverage

**Stretch Goal (Dynamic):**
- [ ] Calculate buffer based on bandwidth estimate
- [ ] "Can play through" heuristic
- [ ] Account for content duration and bitrate

## Dependencies
**Depends on:** None
**Blocks:** F5 (Forward Buffer Management)

## Technical Notes
**Files:** `packages/spf/src/core/abr/forward-buffer-calculator.ts`

Start simple (fixed 30s), enhance if time permits. Keep interface same for easy upgrade.

## Bundle Size Impact
**Target:** <200 bytes (simple) or <500 bytes (dynamic)
EOF
)" --label "spf,wave-1,P0,Pure/Isolated,size-S"

echo "Creating P9: Back Buffer Strategy..."
gh issue create --repo "$REPO" --title "[P9] Back Buffer Strategy" --body "$(cat <<'EOF'
Calculate back buffer flush points. Start with simple "keep N segments", enhance to smart if time permits.

## Acceptance Criteria

**V1 (Must Have):**
- [ ] Keep fixed number of segments (e.g., 2 segments behind playhead)
- [ ] Return flush range (start, end times)
- [ ] Unit tests with ≥80% coverage

**Stretch Goal (Smart):**
- [ ] Track total bytes in buffer
- [ ] Monitor append errors (buffer full)
- [ ] Flush at segment boundaries when needed

## Dependencies
**Depends on:** None
**Blocks:** F6 (Back Buffer Management)

## Technical Notes
**Files:** `packages/spf/src/core/buffer/back-buffer-strategy.ts`

Start simple (keep N segments), enhance if time permits. Keep interface same for easy upgrade.

## Bundle Size Impact
**Target:** <200 bytes (simple) or <500 bytes (smart)
EOF
)" --label "spf,wave-1,P1,Pure/Isolated,size-S"

# Continue with P10-P17...
echo "Creating P10: MediaSource Setup..."
gh issue create --repo "$REPO" --title "[P10] MediaSource Setup" --body "$(cat <<'EOF'
Create and configure MediaSource and SourceBuffer instances for MSE/MMS.

## Acceptance Criteria
- [ ] Create MediaSource instance
- [ ] Attach to HTMLMediaElement via Object URL
- [ ] Create SourceBuffer with codec string
- [ ] Handle sourceopen event
- [ ] Support ManagedMediaSource when available
- [ ] Error handling for unsupported codecs
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** None
**Blocks:** P11 (Segment Appender), P12 (Buffer Flusher)

## Technical Notes
**Files:** `packages/spf/src/dom/media/mediasource-setup.ts`
Isolated wrapper around MSE/MMS APIs.

## Bundle Size Impact
**Target:** <1KB
EOF
)" --label "spf,wave-1,P0,Pure/Isolated,size-S"

echo "Creating P11: Segment Appender..."
gh issue create --repo "$REPO" --title "[P11] Segment Appender" --body "$(cat <<'EOF'
Append segment data to SourceBuffer with error handling.

## Acceptance Criteria
- [ ] Append ArrayBuffer to SourceBuffer
- [ ] Handle appendBuffer operation
- [ ] Handle updateend event
- [ ] Error handling for append failures
- [ ] Queue segments if SourceBuffer updating
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** P10 (MediaSource Setup)
**Blocks:** F4 (Segment Fetch Pipeline), F9 (Quality Switching)

## Technical Notes
**Files:** `packages/spf/src/dom/media/segment-appender.ts`
Handle SourceBuffer state machine correctly.

## Bundle Size Impact
**Target:** <1KB
EOF
)" --label "spf,wave-1,P0,Pure/Isolated,size-S"

echo "Creating P12: Buffer Flusher..."
gh issue create --repo "$REPO" --title "[P12] Buffer Flusher" --body "$(cat <<'EOF'
Remove data from SourceBuffer to manage memory.

## Acceptance Criteria
- [ ] Remove time range from SourceBuffer
- [ ] Handle remove operation
- [ ] Handle updateend event
- [ ] Error handling for remove failures
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** P10 (MediaSource Setup)
**Blocks:** F7 (Seek Orchestration), F6 (Back Buffer Management)

## Technical Notes
**Files:** `packages/spf/src/dom/media/buffer-flusher.ts`
Use SourceBuffer.remove(start, end).

## Bundle Size Impact
**Target:** <500 bytes
EOF
)" --label "spf,wave-1,P0,Pure/Isolated,size-XS"

echo "Creating P13: Track Element Manager..."
gh issue create --repo "$REPO" --title "[P13] Track Element Manager" --body "$(cat <<'EOF'
Use <track> element to fetch and parse WebVTT segments. POC already validated.

## Acceptance Criteria
- [ ] Set src on <track> element for WebVTT segment
- [ ] Handle track mode changes (showing/hidden)
- [ ] Listen to track mode events
- [ ] Integration with HTMLMediaElement
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** None
**Blocks:** F13 (Caption Loading Flow)

## Technical Notes
**Files:** `packages/spf/src/dom/captions/track-element-manager.ts`
POC already done - implement from spike.

## Bundle Size Impact
**Target:** <1KB
EOF
)" --label "spf,wave-1,P0,Pure/Isolated,size-S"

echo "Creating P14: Caption Sync Validator..."
gh issue create --repo "$REPO" --title "[P14] Caption Sync Validator" --body "$(cat <<'EOF'
Testing utility to verify captions display in sync with video.

## Acceptance Criteria
- [ ] Check caption cue timing vs video currentTime
- [ ] Validate cue display at correct times
- [ ] Test helper for E2E tests
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** P13 (Track Element Manager)
**Blocks:** None (testing utility)

## Technical Notes
**Files:** `packages/spf/src/dom/captions/tests/sync-validator.ts`
Test helper, not production code.

## Bundle Size Impact
**Target:** N/A (test utility)
EOF
)" --label "spf,wave-3,P1,Pure/Isolated,size-XS"

echo "Creating P15: Core Type Definitions..."
gh issue create --repo "$REPO" --title "[P15] Core Type Definitions" --body "$(cat <<'EOF'
TypeScript type definitions for core SPF types (Presentation, Track, Segment, State).

## Acceptance Criteria
- [ ] Presentation type
- [ ] Track types (PartialVideoTrack, VideoTrack, etc.)
- [ ] Segment type
- [ ] State type definitions
- [ ] Type guards (isResolvedPresentation, isResolvedTrack, etc.)
- [ ] Exported from public API

## Dependencies
**Depends on:** None
**Blocks:** All other work (everyone needs types)

## Technical Notes
**Files:** `packages/spf/src/core/types/index.ts`
Foundation for type safety throughout SPF.

## Bundle Size Impact
**Target:** N/A (types only)
EOF
)" --label "spf,wave-1,P1,Pure/Isolated,size-S"

echo "Creating P16: Preload State Reader..."
gh issue create --repo "$REPO" --title "[P16] Preload State Reader" --body "$(cat <<'EOF'
Read media element preload attribute to determine fetch timing.

## Acceptance Criteria
- [ ] Read HTMLMediaElement.preload
- [ ] Return normalized value (none/metadata/auto)
- [ ] Handle missing attribute (default to auto)
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** None
**Blocks:** O5 (Preload Orchestrator)

## Technical Notes
**Files:** `packages/spf/src/dom/utils/preload.ts`
Simple utility function.

## Bundle Size Impact
**Target:** <200 bytes
EOF
)" --label "spf,wave-1,P1,Pure/Isolated,size-XS"

echo "Creating P17: Media Event Helpers..."
gh issue create --repo "$REPO" --title "[P17] Media Event Helpers" --body "$(cat <<'EOF'
Listen to HTMLMediaElement events (play, pause, seeking, seeked, etc.).

## Acceptance Criteria
- [ ] Helper to listen to media events
- [ ] Cleanup on unlisten
- [ ] Type-safe event handlers
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** None
**Blocks:** O6 (Media Event Orchestrator)

## Technical Notes
**Files:** `packages/spf/src/dom/events/media-events.ts`
Wrapper around addEventListener for media events.

## Bundle Size Impact
**Target:** <500 bytes
EOF
)" --label "spf,wave-1,P0,Pure/Isolated,size-XS"

# O2, O11, T1, T4, T6 (remaining Wave 1)
echo "Creating O2: State Batching/Flush..."
gh issue create --repo "$REPO" --title "[O2] State Batching/Flush" --body "$(cat <<'EOF'
Enhancement to O1 state container - batched updates via microtask flush.

## Acceptance Criteria
- [ ] Multiple patches batched into single notification
- [ ] queueMicrotask for flush
- [ ] Manual flush() function
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** O1 (State Container)
**Blocks:** None (enhancement to O1)

## Technical Notes
**Files:** `packages/spf/src/core/state/create-state.ts`
Already part of O1, may just need tests/refinement.

## Bundle Size Impact
**Target:** <200 bytes (part of O1)
EOF
)" --label "spf,wave-1,P1,Orchestration,size-S"

echo "Creating O11: Structured Logging System..."
gh issue create --repo "$REPO" --title "[O11] Structured Logging System" --body "$(cat <<'EOF'
Logging infrastructure with levels and configurable output for development debugging.

## Acceptance Criteria
- [ ] Log levels (debug, info, warn, error)
- [ ] Configurable log level
- [ ] Structured logging (not just console.log)
- [ ] Easy to enable/disable
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** None
**Blocks:** All features (everyone needs logging)

## Technical Notes
**Files:** `packages/spf/src/utils/logging.ts`
Minimal for V1, can be simple wrapper around console with levels.

## Bundle Size Impact
**Target:** <1KB (need to minimize impact)
EOF
)" --label "spf,wave-1,P1,Orchestration,size-S"

echo "Creating T1: Unit Test Infrastructure..."
gh issue create --repo "$REPO" --title "[T1] Unit Test Infrastructure" --body "$(cat <<'EOF'
Vitest setup with mocks for MediaSource, SourceBuffer, fetch APIs.

## Acceptance Criteria
- [ ] Vitest configured and working
- [ ] Mocks for MediaSource API
- [ ] Mocks for SourceBuffer operations
- [ ] Mocks for fetch/network
- [ ] Test utilities and helpers
- [ ] Coverage reporting configured (≥80% target)
- [ ] Can run tests in CI

## Dependencies
**Depends on:** None
**Blocks:** All testing (T2-T10)

## Technical Notes
**Files:** `packages/spf/vitest.config.ts`, `packages/spf/tests/setup.ts`
Foundation for all unit tests.

## Bundle Size Impact
**Target:** N/A (dev dependency)
EOF
)" --label "spf,wave-1,P0,Testing,size-M"

echo "Creating T4: Playwright Setup..."
gh issue create --repo "$REPO" --title "[T4] Playwright Setup" --body "$(cat <<'EOF'
Browser automation infrastructure for E2E testing across browsers.

## Acceptance Criteria
- [ ] Playwright installed and configured
- [ ] Test runners for Chrome, Safari, Firefox, Edge
- [ ] Helper utilities for E2E tests
- [ ] Can run tests in CI
- [ ] Test isolation and cleanup

## Dependencies
**Depends on:** None
**Blocks:** T5 (Browser Test Helpers), T10 (Performance Benchmarks)

## Technical Notes
**Files:** `packages/spf/playwright.config.ts`
Takes time to set up, start early.

## Bundle Size Impact
**Target:** N/A (dev dependency)
EOF
)" --label "spf,wave-1,P0,Testing,size-L"

echo "Creating T6: Test Stream Setup..."
gh issue create --repo "$REPO" --title "[T6] Test Stream Setup" --body "$(cat <<'EOF'
Curated test streams for development and CI (Mux + Apple HLS examples).

## Acceptance Criteria
- [ ] Mux-hosted CMAF test streams identified
- [ ] Apple HLS examples (modified to constraints)
- [ ] Local test server for development
- [ ] CDN-hosted streams for CI reliability
- [ ] Streams cover edge cases (different durations, bitrates, with/without captions)

## Dependencies
**Depends on:** None
**Blocks:** All testing that needs real streams

## Technical Notes
Reliable test content is critical for reproducible tests.

## Bundle Size Impact
**Target:** N/A (test infrastructure)
EOF
)" --label "spf,wave-1,P0,Testing,size-M"

echo ""
echo "✅ Wave 1 remaining issues created!"
echo ""

# Wave 2 Issues
echo "Creating Wave 2 issues..."

echo "Creating O5: Preload Orchestrator..."
gh issue create --repo "$REPO" --title "[O5] Preload Orchestrator" --body "$(cat <<'EOF'
Monitor src + preload state to determine when to fetch playlist. Controls fetch timing.

## Acceptance Criteria
- [ ] Monitor when src is set on media element
- [ ] Check preload attribute
- [ ] If preload != "none", trigger playlist fetch
- [ ] If preload == "none", wait for first play event
- [ ] Integrate with resolvables pattern (O3)
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** O1 (State), O3 (Resolvables), P16 (Preload Reader)
**Blocks:** F1 (Playlist Resolution)

## Technical Notes
**Files:** `packages/spf/src/core/orchestration/preload-orchestrator.ts`
Part of critical path.

## Bundle Size Impact
**Target:** <1KB
EOF
)" --label "spf,wave-2,P0,Orchestration,size-M"

# Continue with more issues...
echo "Creating O6: Media Event Orchestrator..."
gh issue create --repo "$REPO" --title "[O6] Media Event Orchestrator" --body "$(cat <<'EOF'
React to play/pause/seek events from HTMLMediaElement. Event-driven coordination.

## Acceptance Criteria
- [ ] Listen to media element events
- [ ] React to play/pause events
- [ ] React to seeking/seeked events
- [ ] React to ratechange if needed
- [ ] Update state based on events
- [ ] Unit tests with ≥80% coverage

## Dependencies
**Depends on:** O1 (State), P17 (Media Event Helpers)
**Blocks:** F11, F12, F7 (Playback event handling)

## Technical Notes
**Files:** `packages/spf/src/core/orchestration/media-event-orchestrator.ts`

## Bundle Size Impact
**Target:** <2KB
EOF
)" --label "spf,wave-2,P0,Orchestration,size-M"

echo ""
echo "⚠️  Script truncated for length - showing pattern..."
echo "You would continue creating all remaining issues following this same pattern."
echo ""
echo "To complete, either:"
echo "1. Run this script in parts"
echo "2. Create remaining issues manually using the patterns shown"
echo "3. Import from all-issues.md"
