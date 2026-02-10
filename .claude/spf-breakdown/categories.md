# SPF Feature Categories

This document captures the high-level feature categories and capabilities needed for the Stream Processing Framework.

## Instructions

For each category below, describe:
- What features/capabilities are needed
- Key use cases or requirements
- Any known constraints or requirements
- Initial thoughts on scope (MVP vs future)

---

## A. User-Facing Features

_What can developers/users do with SPF?_

### Playback Controls

**Priority:** P0 (V1 Must-Have)

**Description:**
Basic playback operations for VOD content.

**Capabilities:**
- Load HLS source (multivariant playlist URL)
- Play/pause
- Seek to arbitrary time
- Adjustable playback rate (speed control)
- Basic buffering with forward buffer management

**Use Cases:**
- Video.js integration for standard playback controls
- Custom player UI implementations

**Requirements:**
- Work with both MSE and MMS (Managed Media Source)
- Separate Audio + Video SourceBuffer management
- Basic buffer flushing on seek

**Scope:**
- V1: Core operations only
- Out of scope: Frame-accurate seeking, advanced buffer strategies

---

### Adaptive Quality (ABR)

**Priority:** P0 (V1 Must-Have)

**Description:**
Naive adaptive bitrate selection based on network conditions. Simple heuristic with clear extension points.

**Capabilities:**
- EWMA (Exponentially Weighted Moving Average) throughput estimation
- Forward buffer management
- Simple quality selection algorithm
- Quality switching without rebuffering

**Use Cases:**
- Automatic quality adjustment as network conditions change
- Extension points for future sophisticated ABR algorithms

**Requirements:**
- More than "always pick highest rendition"
- Much less than full ABR sophistication (that comes later)
- Clear extension points for future enhancements
- Track download speed and choose appropriate bitrate

**Scope:**
- V1: Simple heuristic only
- Future: Buffer-based ABR, sophisticated algorithms

---

### Manual Quality Selection

**Priority:** P1 (High Priority - Stretch for V1)

**Description:**
API to allow manual rendition selection, overriding automatic ABR.

**Capabilities:**
- Set specific quality/bitrate manually
- Disable ABR and lock to chosen rendition
- Re-enable ABR (return to auto)

**Use Cases:**
- Custom quality selector UI in player
- Testing/debugging specific renditions
- User preference for quality over bandwidth

**Requirements:**
- Smooth track switching (no rebuffering)
- ABR respects manual override
- Clear API for setting/unsetting manual quality

**Scope:**
- V1 Stretch: Basic API for manual selection
- Future: Quality constraints (min/max bitrate)

---

### Subtitles/Captions

**Priority:** P0 (V1 Must-Have)

**Description:**
Basic caption support for accessibility and global audiences.

**Capabilities:**
- WebVTT format support
- Segmented captions (not sidecar files initially)
- Single language
- Unstyled rendering (browser default)
- Stretch: Default on

**Use Cases:**
- Accessibility compliance
- International content
- Video.js text track integration

**Requirements:**
- Must work with Video.js TextTrack API
- Parse WebVTT from HLS playlist
- Display cues in sync with video

**Scope:**
- V1: Basic WebVTT, segmented, unstyled, single language
- Out of scope: Advanced styling, multiple languages, CEA-608, TTML
- Future: Multiple languages, styling, sidecar files

**Notes:**
Without captions, hard to claim we're near final engine size or production-shaped.

---

### Audio Track Selection

**Priority:** OUT OF SCOPE (V1)

**Description:**
Not needed for V1 - single audio playlist only.

**Constraints:**
- V1 only supports single audio playlist
- Multi-audio is explicitly out of scope

**Future Consideration:**
- May add multi-audio track support in later versions

---

### Thumbnail Previews

**Priority:** OUT OF SCOPE (V1)

**Description:**
Not needed for V1.

**Future Consideration:**
- May add thumbnail preview support in later versions

---

### Live Streaming

**Priority:** OUT OF SCOPE (V1)

**Description:**
Explicitly out of scope. VOD only for V1.

**Constraints:**
- No live playlists
- No DVR
- No low-latency modes

**Future Consideration:**
- Live support may come in future versions if needed

---

### Performance Monitoring

**Priority:** P1 (V1 - Focus on startup and buffering)

**Description:**
Track key performance metrics for optimization and debugging.

**V1 Scope - In Scope:**
- **Startup time metrics** (time to first frame)
- **Buffer health metrics** (buffer level, forward buffer duration)
- Basic playback state events for Video.js integration

**V1 Scope - Document but Out of Scope:**
- Quality change events and tracking
- Network throughput metrics
- Detailed ABR decision logging
- Rebuffering frequency/duration
- Seek latency metrics
- Frame drop tracking
- Comprehensive playback telemetry

**Use Cases:**
- Optimize startup performance
- Debug buffering issues
- Video.js event system integration
- Future: Comprehensive performance tracking

**Requirements:**
- Emit events for startup phases
- Track buffer state changes
- Minimal overhead (don't impact bundle size significantly)

---

### Error Handling

**Priority:** P2 (Medium priority - Document for V1)

**Description:**
Basic error detection and reporting. Given reliable content assumption, sophisticated recovery is not a priority.

**V1 Scope:**
- Detect and report fatal errors (network failure, format errors)
- Basic error events for Video.js integration
- Graceful failure (stop playback, emit error event)
- Minimal recovery logic (given reliable content assumption)

**Use Cases:**
- Graceful failure when content unavailable
- User feedback on playback issues
- Video.js error integration
- Development/debugging

**Constraints:**
- Presume content is reliable (no gaps, alignment issues)
- Simple error detection, not sophisticated recovery
- Focus on "fail gracefully" over "recover automatically"

**Error Categories to Handle:**
- Network errors (fetch failures, timeout)
- Format errors (invalid playlist, unsupported codec)
- Media errors (MediaSource/SourceBuffer failures)
- Browser API errors

**Scope:**
- V1: Basic error detection and reporting
- Out of scope: Sophisticated retry logic, automatic recovery, detailed error diagnostics
- Future: Enhanced error recovery, retry strategies

---

## B. Protocol & Format Support

_What content types and protocols need to work?_

### HLS VOD

**Priority:** P0 (V1 Must-Have)

**Description:**
Core HLS parsing and playback for Video-on-Demand.

**Capabilities:**
- Parse multivariant playlist (master.m3u8)
- Parse media playlists (variant streams)
- Fetch video/audio segments
- MediaSource/SourceBuffer integration
- Initial track selection
- Segment sequencing and buffering

**Requirements:**
- Spec-compliant HLS parsing
- Support Mux-hosted streams
- Support Apple HLS test streams (or modifications)
- Must work with CMAF/ISO-BMFF container format
- Separate audio + video SourceBuffer management
- Use fetch with readable stream for performance
- No abortable fetches

**Test Sources:**
- Mux-hosted CMAF streams (primary)
- Apple HLS examples (modified to meet constraints)

**Scope:**
- V1: Basic multivariant + media playlist parsing, segment fetching
- Out of scope: Discontinuities, byte-range requests, content steering, instant clipping

---

### HLS Live

**Priority:** OUT OF SCOPE (V1)

**Description:**
Explicitly out of scope for V1.

**Constraints:**
- No live playlist support
- No sliding window
- No live edge tracking
- No DVR
- No low-latency HLS

**Future Consideration:**
- May add live support in later versions

---

### DASH Support

**Priority:** OUT OF SCOPE (V1)

**Description:**
Explicitly out of scope for V1. HLS only.

**Future Consideration:**
- May add DASH support in later versions if needed

---

### Container Formats

**Priority:** P0 (V1 Must-Have)

**Description:**
Support CMAF/ISO-BMFF container format only.

**Requirements:**
- CMAF/ISO-BMFF (fMP4) parsing
- **NO MPEG-TS support** (explicitly excluded)
- PTS 0 for audio + video media
- Separate audio and video SourceBuffers

**Constraints:**
- Mux-specific: No TS, no instant clipping implications
- Presume no gaps in segments
- Presume A+V time alignment

**Scope:**
- V1: CMAF/ISO-BMFF only
- Out of scope: MPEG-TS, other container formats

---

### Codec Support

**Priority:** P0 (V1 Must-Have)

**Description:**
Support H.264 video and AAC audio only.

**Requirements:**
- H.264 (AVC) video codec
- AAC audio codec (stereo or mono)
- **NO H.265/HEVC** (explicitly excluded)
- **NO other codecs** (AV1, VP9, etc.)

**Constraints:**
- Mux-specific constraint: H.264 + AAC only
- Presume codec support in target browsers (evergreen browsers support H.264+AAC)

**Scope:**
- V1: H.264 + AAC only
- Out of scope: H.265, AV1, VP9, other codecs
- Future: May add additional codecs if needed

---

### DRM Integration

**Priority:** OUT OF SCOPE (V1)

**Description:**
Explicitly out of scope for V1. No DRM support.

**Constraints:**
- No EME (Encrypted Media Extensions)
- No Widevine, FairPlay, PlayReady
- Clear (unencrypted) content only

**Future Consideration:**
- May add DRM support in later versions

---

## C. Platform & Integration

_Where does SPF run and how does it integrate?_

### Browser Support

**Priority:** P0 (V1 Must-Have)

**Description:**
Support latest versions of evergreen browsers.

**Requirements:**
- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Edge (latest)

**Constraints:**
- Evergreen browsers only (no IE11, no old mobile browsers)
- No unpopular desktop/mobile browsers
- MSE and MMS (Managed Media Source) support required
- Code should be somewhat backwards compatible based on what we're building

**Scope:**
- V1: Latest evergreen browsers only
- Out of scope: Non-evergreen browsers, older versions

---

### React Integration

**Priority:** P2 (Future)

**Description:**
Not a V1 priority since SPF will be integrated with Video.js v10.

**Constraints:**
- V1 focus is Video.js integration
- Direct React integration is future work

**Future Consideration:**
- React hooks/components for direct SPF usage
- May be needed if SPF is used outside Video.js context

---

### Framework Adapters

**Priority:** OUT OF SCOPE (V1)

**Description:**
Not needed for V1. Video.js integration is the primary use case.

**Constraints:**
- No Vue, Svelte, Angular adapters for V1

**Future Consideration:**
- May add if SPF is used outside Video.js context

---

### Server-Side Rendering

**Priority:** OUT OF SCOPE (V1)

**Description:**
Not needed for V1. Playback engine requires browser APIs.

**Constraints:**
- SPF requires MediaSource API (browser-only)
- No SSR support needed

**Future Consideration:**
- May need SSR-compatible shell for framework integrations

---

### Native Apps

**Priority:** OUT OF SCOPE (V1)

**Description:**
Not needed for V1. Browser-only.

**Constraints:**
- No React Native support for V1
- No native iOS/Android support

**Future Consideration:**
- Video.js v10 has React Native package, may need native playback engine

---

### CDN Integration

**Priority:** P0 (V1 Must-Have)

**Description:**
Basic single-CDN playback.

**Requirements:**
- Fetch segments from HLS URLs
- Standard HTTP/HTTPS
- Use fetch with readable stream for performance

**Constraints:**
- Single CDN only (no multi-CDN)
- No CDN failover
- No content steering
- Presume reliable CDN (no sophisticated retry logic)

**Scope:**
- V1: Single CDN, basic fetch
- Out of scope: Multi-CDN, failover, content steering, sophisticated retry
- Future: Multi-CDN support, failover strategies

---

## D. Developer Experience

_How easy is it to use and integrate?_

### Public API Design

**Priority:** P1 (Important, but flexibility for V1)

**Description:**
Clean, ergonomic API for playback engine integration with Video.js v10.

**Requirements:**
- Integration points with Video.js v10 architecture
- Load, play, pause, seek, playback rate control
- Event system for playback state changes
- Quality selection API (stretch)
- Text track integration

**Constraints:**
- V1: Primarily used internally by Video.js, not directly by developers
- Can sacrifice some DX/ergonomics for expediency
- Still design with future direct usage in mind

**Scope:**
- V1: Clean integration with Video.js v10
- Future: Public API for direct developer usage

**Tradeoff:**
Developer ergonomics can be sacrificed somewhat for expediency in V1, but avoid egregious design decisions that would require breaking changes later.

---

### TypeScript Types

**Priority:** P1 (Important)

**Description:**
Full TypeScript support since Video.js v10 is TypeScript-first.

**Requirements:**
- Complete type definitions for all APIs
- Type inference where possible
- Integration with Video.js v10 types

**Scope:**
- V1: Full TypeScript types for internal APIs
- Future: Refined types for public API surface

---

### Documentation

**Priority:** P2 (Minimal for V1)

**Description:**
Minimal documentation focused on Video.js integration.

**Requirements:**
- Integration guide for Video.js v10
- Basic API reference
- CMAF playback demo

**Scope:**
- V1: Minimal docs, focus on Video.js integration
- Out of scope: Comprehensive guides, tutorials, advanced examples
- Future: Full documentation when SPF has public API

---

### Examples & Recipes

**Priority:** P1 (Minimal demos for V1)

**Description:**
Demonstrate CMAF playback capabilities.

**Requirements:**
- Mux-hosted CMAF stream demo
- Basic playback controls demo
- Video.js integration example

**Scope:**
- V1: Simple demos showing core capabilities
- Out of scope: Advanced recipes, multiple integration patterns
- Future: Comprehensive examples for direct API usage

---

### Debugging Tools

**Priority:** P1 (V1 - Logging for development)

**Description:**
Basic debugging support for development iteration.

**V1 Scope - In Scope:**
- **Console logging** (debug/info/warn/error levels)
- Log key events (playlist loaded, segment fetched, quality changed, etc.)
- Log errors and warnings
- Configurable log levels (enable/disable in production)

**V1 Scope - Document but Out of Scope:**
- Buffer state visualization
- Network activity timeline
- ABR decision visualization
- Performance profiling tools
- Browser devtools integration
- Visual debugging UI

**Use Cases:**
- Development iteration and debugging
- Troubleshooting playback issues
- Understanding engine behavior
- Future: Enhanced debugging experience

**Requirements:**
- Minimal bundle size impact
- Easy to enable/disable
- Structured logging (not just console.log)
- Integration with Video.js logging if applicable

**Scope:**
- V1: Basic structured logging
- Future: Advanced debugging tools, visualizations, browser devtools integration

---

### Migration Guides

**Priority:** OUT OF SCOPE (V1)

**Description:**
Not applicable for V1 since SPF is new.

**Future Consideration:**
- May need migration guides if replacing existing playback engines in Video.js

---

## E. Quality & Performance

_How well does it work?_

### Startup Time

**Priority:** P2 (Important, but secondary to bundle size)

**Description:**
Time from load() to first frame displayed.

**Requirements:**
- Minimize time to first frame
- Use fetch with readable stream for performance
- Efficient playlist parsing
- Fast initial segment fetch + append

**Constraints:**
- Secondary to bundle size optimization
- Don't sacrifice bundle size for startup time

**Scope:**
- V1: Reasonable startup time (not optimized)
- Future: Startup time optimization

**Reference Points:**
- Track startup latency metrics
- Compare with existing engines (hls.js, VHS) as baseline

---

### Seeking Performance

**Priority:** P2 (Important, but secondary to bundle size)

**Description:**
Latency from seek() call to playback resuming at new position.

**Requirements:**
- Basic buffer flushing on seek
- Fetch appropriate segments for seek target
- Minimal delay to resume playback

**Constraints:**
- Secondary to bundle size optimization
- Don't sacrifice bundle size for seek optimization

**Scope:**
- V1: Basic seeking (not optimized)
- Out of scope: Frame-accurate seeking, instant seeking
- Future: Seek optimization, smart buffer strategies

---

### Rebuffering

**Priority:** P1 (Important)

**Description:**
Minimize playback interruptions due to buffer starvation.

**Requirements:**
- Forward buffer management (keep enough ahead)
- Basic ABR to match quality to bandwidth
- Handle buffer health

**Constraints:**
- Presume reliable content (no gaps, A+V alignment)
- No sophisticated buffer strategies for V1

**Scope:**
- V1: Basic buffer management, forward buffering
- Out of scope: Sophisticated buffer strategies, recovery logic
- Future: Advanced buffer optimization

---

### Memory Usage

**Priority:** P2 (Important, but secondary to bundle size)

**Description:**
Minimize memory footprint during playback.

**Requirements:**
- Efficient buffer management
- Clean up old segments
- Avoid memory leaks

**Constraints:**
- Secondary to bundle size optimization
- Don't sacrifice bundle size for memory optimization

**Scope:**
- V1: Reasonable memory usage (not optimized)
- Future: Memory profiling and optimization

---

### Bundle Size

**Priority:** P0 (PRIMARY OPTIMIZATION TARGET)

**Description:**
**This is the #1 priority for SPF.** Minimize engine bundle size.

**Requirements:**
- Significantly smaller than hls.js, dash.js, VHS, shaka
- Tree-shakeable architecture
- No unnecessary dependencies
- Modular design for composition

**Target Reference:**
- Compare to mux-background-video (don't need to be quite that small, but use as reference)
- Track bundle size in CI
- Set size budget and fail builds that exceed it

**Constraints:**
- When tradeoffs exist, bundle size wins
- Accept some DX/ergonomics sacrifice for size
- Accept some performance sacrifice for size
- Constrained feature set enables small size

**Scope:**
- V1: Aggressive bundle size optimization
- Ongoing: Monitor size, prevent growth

**Success Metric:**
This is the primary success metric for SPF. Bundle size should be dramatically smaller than existing engines.

---

### Test Coverage

**Priority:** P0 (V1 Must-Have)

**Description:**
Production-ready testing infrastructure. See "Testing Infrastructure" category below for details.

**Requirements:**
- Unit tests for core functionality
- Integration tests for playback scenarios
- E2E tests across browsers
- Test stream infrastructure
- CI/CD integration

**Scope:**
- V1: Comprehensive testing for production readiness
- See dedicated "Testing Infrastructure" category

---

### Cross-Browser Testing

**Priority:** P0 (V1 Must-Have)

**Description:**
Verify functionality across target browsers.

**Requirements:**
- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Edge (latest)
- Automated testing in CI

**Scope:**
- V1: Evergreen browser testing
- Out of scope: Non-evergreen browsers, old versions

---

## F. Testing Infrastructure

_How do we ensure production readiness?_

### Unit Testing

**Priority:** P0 (V1 Must-Have)

**Description:**
Test individual functions, modules, and components in isolation.

**Requirements:**
- Vitest framework (already in repo)
- Test utilities and helpers
- Coverage reporting (target ≥80%)
- Mock MediaSource, SourceBuffer, fetch
- Fast test execution

**Scope:**
- V1: Comprehensive unit tests for core functionality
- BDD-style red/green testing for specific features
- CI integration with coverage requirements

---

### Integration Testing

**Priority:** P0 (V1 Must-Have)

**Description:**
Test interactions between components and subsystems.

**Requirements:**
- Test playlist parsing → segment fetching → buffering
- Test ABR logic with simulated network conditions
- Test seek operations end-to-end
- Test caption loading and display

**Scope:**
- V1: Key integration scenarios covered
- Simulate real playback workflows
- CI integration

---

### E2E/Browser Testing

**Priority:** P0 (V1 Must-Have)

**Description:**
Test actual playback in real browsers.

**Requirements:**
- Playwright or similar for browser automation
- Test across Chrome, Safari, Firefox, Edge
- Real HLS streams (Mux-hosted, Apple examples)
- Verify video actually plays and seeks
- Verify captions display

**Scope:**
- V1: Core playback scenarios across browsers
- CI integration with browser testing
- May use BrowserStack or similar for Safari testing

---

### Test Stream Infrastructure

**Priority:** P0 (V1 Must-Have)

**Description:**
Reliable test streams for development and CI.

**Requirements:**
- Mux-hosted CMAF test streams
- Apple HLS examples (modified to constraints)
- Local test server for development
- CDN-hosted streams for CI reliability

**Scope:**
- V1: Curated set of test streams covering:
  - Different bitrates/resolutions
  - Different durations
  - With/without captions
  - Edge cases (short videos, long videos)

---

### CI/CD Integration

**Priority:** P0 (V1 Must-Have)

**Description:**
Automated testing in continuous integration.

**Requirements:**
- Run tests on every PR
- Run tests on main branch
- Fail builds on test failures
- Fail builds on coverage drop
- Fail builds on bundle size increase
- Fast CI feedback (< 10 minutes)

**Scope:**
- V1: Full CI integration
- GitHub Actions (likely already in repo)
- Bundle size tracking
- Coverage tracking

---

### Performance Testing

**Priority:** P1 (High priority)

**Description:**
Benchmark and track performance metrics.

**Requirements:**
- Startup time measurement
- Seek latency measurement
- Memory usage profiling
- Bundle size tracking
- Comparison with baseline/other engines

**Scope:**
- V1: Basic performance benchmarks
- Track metrics over time
- CI integration for regression detection
- Future: Detailed performance profiling

---

### Coverage & Quality Metrics

**Priority:** P1 (High priority)

**Description:**
Track test coverage and code quality.

**Requirements:**
- Unit test coverage ≥80%
- Track coverage over time
- Prevent coverage regressions
- Quality gates in CI

**Scope:**
- V1: Coverage tracking and enforcement
- CI integration
- Coverage reports in PRs

---

## Product Vision & Constraints

### Primary Use Case
Spec-compliant HLS playback engine with highly constrained feature set, optimized for bundle size. Will be optionally used with Video.js v10 player architecture. Test streams from Mux and Apple HLS examples.

### Target Users
- **Initial**: Integration with Video.js v10 (indirect usage by developers)
- **Future**: Direct developer interaction with playback engine
- **Tradeoff**: Can sacrifice some DX/ergonomics for expediency, but design with future direct usage in mind

### Differentiation
1. **Bundle size** - Primary optimization target (smaller than hls.js, dash.js, VHS, shaka)
2. **Constrained feature set** - VOD-only, CMAF-only, H.264+AAC-only
3. **Architecture** - Composition of modular implementations for different use cases
4. **Reference**: mux-background-video for size comparison (don't need to be quite that small)

### V1 Beta Timeline: February

### Non-Negotiable Constraints
- VOD only (no live)
- CMAF/ISO-BMFF + H.264 + AAC (stereo/mono) - **NO TS, NO H.265**
- PTS 0 for A+V media
- Single audio playlist
- Video playlists vary by bitrate + resolution only
- HLS only (no DASH)
- No multi-CDN, no DRM
- Presume reliable content (no gaps, A+V time alignment)
- Must work for both MSE and MMS (Managed Media Source)
- No web workers
- Use fetch response body readable stream for performance
- No abortable fetches
- Browser support: Latest versions of Chrome, Safari, Firefox, Edge (evergreen only)

### Organization Preference
**Incremental waves** - POC → V1 Beta (Feb) → Production → Advanced

### Primary Success Metric
**Bundle size** - This is the #1 optimization target. When tradeoffs exist, bundle size wins.
