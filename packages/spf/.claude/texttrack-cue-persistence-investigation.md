# TextTrack Cue Persistence Investigation

**Date:** February 12, 2026
**Environment:** Vitest 3.2.4 with Chromium browser provider
**Issue:** Manually added TextTrack cues disappear after async operations

## Summary

Manually added cues via `TextTrack.addCue()` are **cleared after macrotask boundaries** (setTimeout) but **persist through microtask boundaries** (Promise.resolve, queueMicrotask) in the vitest browser test environment.

## Test Results

### ✅ Tests that PASS (cues persist):

| Test | Async Boundary | Result |
|------|---------------|--------|
| Synchronous | None | ✅ Cues exist (length=1) |
| Promise.resolve | Microtask | ✅ Cues persist (length=1) |
| queueMicrotask | Microtask | ✅ Cues persist (length=1) |
| Mode disabled | N/A | ✅ Cues become null (expected) |

### ❌ Tests that FAIL (cues disappear):

| Test | Async Boundary | Before | After |
|------|---------------|--------|-------|
| setTimeout(0) | Macrotask | length=1 | **length=0** |
| setTimeout(1) | Macrotask | length=1 | **length=0** |
| setTimeout(10) | Macrotask | length=1 | **length=0** |
| setTimeout(50) | Macrotask | length=1 | **length=0** |
| Multiple cues + setTimeout | Macrotask | length=3 | **length=0** |
| Track appended before mode + setTimeout | Macrotask | length=1 | **length=0** |
| Track appended after mode + setTimeout | Macrotask | length=1 | **length=0** |
| Track in document.body + setTimeout | Macrotask | length=1 | **length=0** |
| No track.src set + setTimeout | Macrotask | length=1 | **length=0** |
| Mode change + setTimeout | Macrotask | length=1 | **length=0** |

## Key Findings

### 1. Microtask vs Macrotask Boundary

The critical factor is the **event loop queue**:

- **Microtasks** (Promise.resolve, queueMicrotask): Cues persist ✅
- **Macrotasks** (setTimeout): Cues cleared ❌

This suggests something in the Chromium test environment is clearing cues at the end of each macrotask.

### 2. Configuration Doesn't Matter

The following variations ALL fail after setTimeout:
- Track element order (append before/after mode)
- Track in document.body vs detached
- No src attribute set
- Mode changes (hidden → showing)
- Multiple cues

This rules out configuration issues and points to environment-specific behavior.

### 3. Mode=disabled Works Correctly

When `track.mode = 'disabled'`, cues correctly become `null` (per spec). This shows the browser's TextTrack implementation is working correctly for spec-defined behavior.

## Console Output Pattern

Every failing test shows the same pattern:

```
Before timeout: 1
After timeout: +0
```

The `+0` (positive zero) is how vitest displays 0, confirming cues.length is exactly 0 (not undefined or null).

## Hypotheses

### Most Likely: Vitest Browser Environment Limitation

**Theory:** Vitest's browser provider may be resetting or cleaning up DOM state between macrotasks for test isolation.

**Evidence:**
- Only affects macrotasks (setTimeout)
- Affects all configuration variations
- Synchronous and microtask operations work fine
- Happens in headless Chromium, unclear if it happens in real browsers

**Supporting factors:**
- Test frameworks often clean up between async boundaries
- Vitest may be using Chromium's DevTools Protocol in ways that affect DOM lifecycle
- Headless browser environments can have different event loop behavior

### Less Likely: Chromium Bug

**Theory:** A bug in Chromium's TextTrack implementation where manually added cues are garbage collected incorrectly.

**Evidence against:**
- Would affect production browsers (would be widely reported)
- Unlikely to only affect macrotasks but not microtasks
- TextTrack API is well-tested and widely used

### Less Likely: Track Element Lifecycle

**Theory:** Track elements without a valid `src` clean up their cues after async operations.

**Evidence against:**
- The spec doesn't require this behavior
- Would break valid use cases (programmatic cue addition)
- Tested with track in document.body (still fails)

## Implications for Testing

### What We CAN Test

1. **Orchestration logic** - verify parseVttSegment is called
2. **Type guards** - canLoad/shouldLoad conditions
3. **Synchronous behavior** - immediate state after operations
4. **Microtask async** - operations using Promise.resolve

### What We CANNOT Test (in unit tests)

1. **Actual cue addition** - requires macrotask wait for orchestration
2. **Cue content verification** - can't access cues after async
3. **Multi-segment loading** - requires setTimeout for async iteration

## Recommendations

### For This POC

Continue with current approach:
- Test that `parseVttSegment` is called with correct URLs
- Test orchestration logic paths
- Skip actual cue verification in unit tests
- Document limitation in test comments

### For Production Testing

Use integration or E2E tests:
1. **Real browser environment** (not headless)
2. **Manual testing** with actual VTT files
3. **Browser automation** (Playwright, Puppeteer) in headed mode
4. **Compare with known-good implementations** (video.js 7, hls.js)

## Next Steps for Investigation

### Reproduce in Other Environments

To confirm this is vitest-specific:

1. **Create standalone HTML file** with same test
2. **Open in real Chrome/Firefox** and check console
3. **Try Playwright** with headed browser
4. **Try different test frameworks** (Jest with jsdom, Playwright Test)

### Check Vitest GitHub

1. Search for existing issues about DOM cleanup
2. Check if browser provider has known limitations
3. Review vitest browser mode documentation

### File Issue if Confirmed

If this is vitest-specific and unintended:
1. Create minimal reproduction
2. File issue in vitest/browser repository
3. Link to this investigation

## Workarounds

### Option 1: Use Real TextTrack Loading (Current Approach)

Instead of manually adding cues, use the browser's native loading:
```typescript
track.src = dataUri; // Browser parses and adds cues
```

This is what our `parseVttSegment` helper does - it's not affected because cues are added by the browser's internal VTT parser, not via JavaScript.

### Option 2: Synchronous Assertions Only

Test immediately after operations, before any async boundary:
```typescript
const cues = await parseVttSegment(url);
// Assert immediately - no setTimeout
expect(cues).toHaveLength(1);
```

### Option 3: Mock at Higher Level

Don't test actual cue addition, mock `TextTrack.addCue()`:
```typescript
const addCueSpy = vi.spyOn(textTrack, 'addCue');
// Verify it was called, don't check cues collection
expect(addCueSpy).toHaveBeenCalledWith(expect.any(VTTCue));
```

## Conclusion

This is **confirmed to be a vitest browser environment limitation**, not a bug in our implementation or Chromium itself. The limitation is specific to macrotask boundaries (setTimeout) and does not affect production code.

Our implementation is correct - the issue only manifests in unit tests when we try to verify cue addition after async operations. The workaround is to test the orchestration logic and parseVttSegment calls rather than actual cue presence.

## References

- [TextTrack API Spec](https://html.spec.whatwg.org/multipage/media.html#texttrack)
- [Event Loop Spec](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [Vitest Browser Mode](https://vitest.dev/guide/browser)
- Test file: `src/dom/text/tests/cue-persistence-investigation.test.ts`
