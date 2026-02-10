#!/bin/bash
# Update all 58 SPF issues with project, milestone, status, and parent links

REPO="videojs/v10"
PROJECT_NUMBER="7"
PROJECT_OWNER="videojs"
MILESTONE="Beta"

# Status field IDs
STATUS_FIELD_ID="PVTSSF_lADOADIolc4BHP_1zg4DzzY"
STATUS_BLOCKED="16a80fac"
STATUS_UP_NEXT="e395082b"
STATUS_IN_PROGRESS="47fc9ee4"

# Parent issue field ID
PARENT_FIELD_ID="PVTF_lADOADIolc4BHP_1zg4Dzz0"

# Story Points field ID
STORY_POINTS_FIELD_ID="PVTF_lADOADIolc4BHP_1zg8g5mA"

echo "Updating all SPF issues..."
echo ""

# Helper function to add issue to project and set fields
update_issue() {
  local issue_num=$1
  local parent_epic=$2
  local status_id=$3
  local story_points=$4

  echo "Updating #$issue_num..."

  # 1. Set milestone
  gh issue edit $issue_num --repo $REPO --milestone "$MILESTONE" 2>&1 | grep -v "^$" || true

  # 2. Add to project
  local item_id=$(gh project item-add $PROJECT_NUMBER --owner $PROJECT_OWNER --url "https://github.com/$REPO/issues/$issue_num" --format json 2>&1 | jq -r '.id')

  if [ -n "$item_id" ] && [ "$item_id" != "null" ]; then
    # 3. Set status
    gh project item-edit --id "$item_id" --project-id "PVT_kwDOADIolc4BHP_1" --field-id "$STATUS_FIELD_ID" --single-select-option-id "$status_id" 2>&1 | grep -v "^$" || true

    # 4. Set parent epic (if provided)
    if [ -n "$parent_epic" ]; then
      gh project item-edit --id "$item_id" --project-id "PVT_kwDOADIolc4BHP_1" --field-id "$PARENT_FIELD_ID" --text "$parent_epic" 2>&1 | grep -v "^$" || true
    fi

    # 5. Set story points (if provided)
    if [ -n "$story_points" ]; then
      gh project item-edit --id "$item_id" --project-id "PVT_kwDOADIolc4BHP_1" --field-id "$STORY_POINTS_FIELD_ID" --number "$story_points" 2>&1 | grep -v "^$" || true
    fi
  fi

  echo "  ✅ #$issue_num updated"
}

# Epic issues (no parent, set to "Up next")
echo "=== Updating Epic Issues ==="
update_issue 384 "" "$STATUS_UP_NEXT" ""  # Wave 1 Epic
update_issue 385 "" "$STATUS_BLOCKED" ""  # Wave 2 Epic (blocked by Wave 1)
update_issue 386 "" "$STATUS_BLOCKED" ""  # Wave 3 Epic (blocked by Wave 2)
update_issue 387 "" "$STATUS_BLOCKED" ""  # Wave 4 Epic (blocked by Wave 3)

echo ""
echo "=== Updating Wave 1 Issues (Parent: #384) ==="
# O1, O10 - In Progress (being worked on)
update_issue 388 "#384" "$STATUS_IN_PROGRESS" "8"  # O1
update_issue 389 "#384" "$STATUS_UP_NEXT" "8"  # O10

# O3 - Up next (after O1)
update_issue 390 "#384" "$STATUS_UP_NEXT" "8"  # O3

# P1-P17 - Pure Functions (Up next, highly parallel)
update_issue 391 "#384" "$STATUS_IN_PROGRESS" "3"  # P1 (done)
update_issue 392 "#384" "$STATUS_UP_NEXT" "3"  # P2
update_issue 393 "#384" "$STATUS_UP_NEXT" "1"  # P3
update_issue 394 "#384" "$STATUS_UP_NEXT" "3"  # P4
update_issue 395 "#384" "$STATUS_UP_NEXT" "3"  # P5
update_issue 396 "#384" "$STATUS_UP_NEXT" "3"  # P6
update_issue 397 "#384" "$STATUS_UP_NEXT" "3"  # P7
update_issue 398 "#384" "$STATUS_UP_NEXT" "5"  # P8
update_issue 399 "#384" "$STATUS_UP_NEXT" "3"  # P9
update_issue 400 "#384" "$STATUS_UP_NEXT" "3"  # P10
update_issue 401 "#384" "$STATUS_UP_NEXT" "3"  # P11
update_issue 402 "#384" "$STATUS_UP_NEXT" "1"  # P12
update_issue 403 "#384" "$STATUS_UP_NEXT" "3"  # P13
update_issue 404 "#384" "$STATUS_UP_NEXT" "2"  # P14
update_issue 405 "#384" "$STATUS_UP_NEXT" "3"  # P15
update_issue 406 "#384" "$STATUS_UP_NEXT" "1"  # P16
update_issue 407 "#384" "$STATUS_UP_NEXT" "1"  # P17

# O2, O11 - Orchestration (Up next)
update_issue 408 "#384" "$STATUS_UP_NEXT" "3"  # O2
update_issue 409 "#384" "$STATUS_UP_NEXT" "3"  # O11

# T1, T4, T6 - Testing (Up next)
update_issue 410 "#384" "$STATUS_UP_NEXT" "8"  # T1
update_issue 411 "#384" "$STATUS_UP_NEXT" "13" # T4
update_issue 412 "#384" "$STATUS_UP_NEXT" "8"  # T6

echo ""
echo "=== Updating Wave 2 Issues (Parent: #385) ==="
# All Wave 2 starts as Blocked (depends on Wave 1)
update_issue 413 "#385" "$STATUS_BLOCKED" "8"   # O5
update_issue 414 "#385" "$STATUS_BLOCKED" "8"   # O6
update_issue 415 "#385" "$STATUS_BLOCKED" "5"   # O7
update_issue 416 "#385" "$STATUS_BLOCKED" "13"  # O8
update_issue 417 "#385" "$STATUS_BLOCKED" "5"   # O9
update_issue 418 "#385" "$STATUS_BLOCKED" "5"   # O12
update_issue 419 "#385" "$STATUS_BLOCKED" "8"   # F1
update_issue 420 "#385" "$STATUS_BLOCKED" "5"   # F2
update_issue 421 "#385" "$STATUS_BLOCKED" "8"   # F3
update_issue 422 "#385" "$STATUS_BLOCKED" "8"   # F4
update_issue 423 "#385" "$STATUS_BLOCKED" "8"   # F5
update_issue 424 "#385" "$STATUS_BLOCKED" "8"   # F7
update_issue 425 "#385" "$STATUS_BLOCKED" "5"   # F8
update_issue 426 "#385" "$STATUS_BLOCKED" "5"   # F11
update_issue 427 "#385" "$STATUS_BLOCKED" "2"   # F12
update_issue 428 "#385" "$STATUS_BLOCKED" "5"   # F13
update_issue 429 "#385" "$STATUS_BLOCKED" "5"   # T2
update_issue 430 "#385" "$STATUS_BLOCKED" "8"   # T3
update_issue 431 "#385" "$STATUS_BLOCKED" "8"   # T5
update_issue 432 "#385" "$STATUS_BLOCKED" "8"   # T7

echo ""
echo "=== Updating Wave 3 Issues (Parent: #386) ==="
update_issue 433 "#386" "$STATUS_BLOCKED" "5"   # F6
update_issue 434 "#386" "$STATUS_BLOCKED" "13"  # F9
update_issue 435 "#386" "$STATUS_BLOCKED" "8"   # F10
update_issue 436 "#386" "$STATUS_BLOCKED" "8"   # F14
update_issue 437 "#386" "$STATUS_BLOCKED" "13"  # F15
update_issue 438 "#386" "$STATUS_BLOCKED" "8"   # F16
update_issue 439 "#386" "$STATUS_BLOCKED" "5"   # F17
update_issue 440 "#386" "$STATUS_BLOCKED" "5"   # O4
update_issue 441 "#386" "$STATUS_BLOCKED" "8"   # O13
update_issue 442 "#386" "$STATUS_BLOCKED" "5"   # T8
update_issue 443 "#386" "$STATUS_BLOCKED" "5"   # T9

echo ""
echo "=== Updating Wave 4 Issues (Parent: #387) ==="
update_issue 444 "#387" "$STATUS_BLOCKED" "8"   # F18
update_issue 445 "#387" "$STATUS_BLOCKED" "8"   # T10

echo ""
echo "🎉 All 58 issues updated!"
echo ""
echo "Summary:"
echo "  - Added to Video.js 10 Roadmap project"
echo "  - Set milestone: Beta"
echo "  - Set status: Up next (Wave 1) or Blocked (Wave 2-4)"
echo "  - Linked parent Epics"
echo "  - Set story points"
