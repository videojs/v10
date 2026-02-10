# Issue Consolidation - Simple vs. Advanced

## Changes Needed

### Current State
The `all-issues.md` file only includes the **simple versions** (P9, P11) and references P8, P10 as alternatives to choose from. This creates confusion about which to implement.

### Proposed Consolidation

Combine simple/advanced into **single issues with stretch goals**:

#### P8: Forward Buffer Calculator (Consolidated)
- **V1 (Must Have):** Simple fixed time-based (30s)
- **Stretch Goal:** Dynamic "can play through" calculation
- **Size:** S (5 points) - accounts for potential stretch
- **Strategy:** Ship with simple, enhance if time permits

#### P9: Back Buffer Strategy (Consolidated)
- **V1 (Must Have):** Simple "keep N segments"
- **Stretch Goal:** Smart byte-tracking with append error monitoring
- **Size:** S (3 points) - accounts for potential stretch
- **Strategy:** Ship with simple, enhance if time permits

### Benefits
1. ✅ **Clearer scope** - One issue per feature
2. ✅ **Reduced count** - 58 items instead of 60
3. ✅ **Better planning** - Simple version guarantees delivery
4. ✅ **Flexible** - Can enhance if ahead of schedule
5. ✅ **No confusion** - Don't have to "choose" between alternatives

---

## Updated Breakdown

### New Item Count
- **Old:** 60 items (P1-P19 Pure, O1-O13 Orchestration, F1-F18 Features, T1-T10 Testing)
- **New:** 58 items (P1-P17 Pure, O1-O13 Orchestration, F1-F18 Features, T1-T10 Testing)

### Renumbering Needed
- P9 (Forward Buffer Simple) → P8 (Forward Buffer - simple V1 + dynamic stretch)
- P10 (removed)
- P11 (Back Buffer Simple) → P9 (Back Buffer - simple V1 + smart stretch)
- P12-P19 → P10-P17

### Dependency Updates
- F5 (Forward Buffer Management) → depends on P8 (was P9)
- F6 (Back Buffer Management) → depends on P9 (was P11)

---

## Recommendation

**Option A:** I can regenerate `all-issues.md` with consolidated issues (**5 min**)
- Clean, consistent numbering
- Single issues with V1 + stretch goals
- All dependencies updated

**Option B:** Keep current file and just update documentation (**1 min**)
- Note in README that P9/P11 are the chosen implementations
- Add stretch goal notes to those issues
- Less disruptive

**My recommendation:** **Option A** - Clean regeneration
- Better for long-term clarity
- Proper numbering P1-P17 (not P1-P19 with gaps)
- Ready for GitHub import without confusion

---

## Next Step

Which would you prefer?
1. Regenerate `all-issues.md` with consolidated issues?
2. Keep current file with documentation notes?
