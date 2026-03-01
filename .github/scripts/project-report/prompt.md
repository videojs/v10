You are generating the weekly progress report for **Video.js 10**.

## Step 1: Determine date range

Calculate the most recent completed full week (Monday–Sunday). If today is
Monday, that means last Mon–Sun. If today is any other day, it is the
Monday–Sunday of the current or just-ended week.

The display label should show the full week: "Feb 23 – Mar 1, 2026". For
GitHub search queries, use exactly that Monday–Sunday range.

## Step 2: Collect data from GitHub

Use `gh` CLI commands. Batch GraphQL queries with aliases to stay within
rate limits (5,000 points/hour).

### Project board items

Fetch ALL items with manual cursor pagination. **Do not use `--paginate`** —
it duplicates GraphQL results. Use this pattern:

```bash
CURSOR=""
ALL_ITEMS="[]"
while true; do
  if [ -z "$CURSOR" ]; then AFTER_ARG=""; else AFTER_ARG=", after: \"$CURSOR\""; fi
  RESULT=$(gh api graphql -f query='{ node(id: "PVT_kwDOADIolc4BHP_1") { ... on ProjectV2 { items(first: 100'"$AFTER_ARG"') { pageInfo { hasNextPage endCursor } nodes { status: fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } } points: fieldValueByName(name: "Story Points") { ... on ProjectV2ItemFieldNumberValue { number } } content { ... on Issue { number title state milestone { title } labels(first: 10) { nodes { name } } assignees(first: 5) { nodes { login } } } } } } } } }')
  ITEMS=$(echo "$RESULT" | jq '.data.node.items.nodes')
  ALL_ITEMS=$(echo "$ALL_ITEMS $ITEMS" | jq -s '.[0] + .[1]')
  HAS_NEXT=$(echo "$RESULT" | jq -r '.data.node.items.pageInfo.hasNextPage')
  CURSOR=$(echo "$RESULT" | jq -r '.data.node.items.pageInfo.endCursor')
  if [ "$HAS_NEXT" != "true" ]; then break; fi
done
echo "$ALL_ITEMS" > /tmp/project_items.json
```

### Merged PRs and closed issues

```bash
gh pr list --repo videojs/v10 --state merged --search "merged:START..END" --limit 100 --json number,title,author
gh issue list --repo videojs/v10 --state closed --search "closed:START..END" --limit 100 --json number,title,closedAt
```

### UC epic sub-issues

Fetch sub-issues via REST, then batch story points with aliased GraphQL:

```bash
gh api repos/videojs/v10/issues/{NUMBER}/sub_issues --jq '[.[] | {number, title, state}]'
```

Known UC epics:

| Epic | Issue | Owner |
|------|-------|-------|
| UC-1 Core Playback UI | #489 | Rahim |
| UC-2 Adaptive Streaming | #353 | Wes |
| UC-3 Skins | #490 | Sam |
| UC-4 Captions & Subtitles | #491 | Rahim |
| UC-5 Accessibility | #492 | Rahim |
| UC-8 Keyboard & Power-User | #494 | Rahim |

Check for new epics each week:
```bash
gh issue list --repo videojs/v10 --label epic --milestone Beta --state all --json number,title
```

## Step 3: Calculate metrics

Apply these rules to the collected data:

- **Filter to Beta milestone only**
- **Exclude items labeled `epic`** — these are rollups that double-count SP
- **Status values are case-sensitive**: `Done`, `In progress`, `Up next`, `Ready for review`, `Blocked`
- **SPF dominates** (~66% of SP) — always compute a "Without SPF" breakdown

### Workstream label mapping

| Label | Workstream |
|-------|-----------|
| `spf` | SPF |
| `components` | UI Components |
| `skin` | Skins |
| `media` | Media |
| `a11y` | Accessibility |
| Any label starting with `docs` | Docs & Guides |
| `site` | Site |
| `compiler` | Compiler |
| `store`, `pkg:core`, `pkg:dom` | Core / Store |
| Everything else | Other |

Compute:
1. **Velocity** — SP and items completed THIS WEEK (closed in the date range)
2. **Beta progress** — all-time by status (Done, Active, Blocked, Unplanned)
3. **Without SPF** — same breakdown excluding `spf`-labeled items
4. **By workstream** — total, done, active, blocked per workstream
5. **Team breakdown** — this week's completed SP/items/PRs per assignee
6. **UC epics** — done SP / total SP per epic
7. **Blocked items** — anything with status "Blocked"
8. **What's next** — open items with status In progress, Up next, Ready for review

## Step 4: Post to Slack

Write the report as a JSON file at `/tmp/report.json` matching this exact structure,
then run the Slack posting script.

```json
{
  "header": "Feb 23 – Mar 1, 2026",
  "velocity": {
    "sp_completed": 42,
    "items_completed": 8,
    "prs_merged": 12,
    "issues_closed": 8
  },
  "beta_progress": {
    "total_items": 150,
    "total_sp": 234,
    "by_status": [
      { "status": "Done", "sp": 89, "count": 45 },
      { "status": "In progress", "sp": 30, "count": 12 }
    ]
  },
  "without_spf": {
    "total_sp": 156,
    "done_sp": 67,
    "active_sp": 34,
    "blocked_sp": 5,
    "unplanned_sp": 50
  },
  "by_workstream": [
    { "name": "SPF", "total": 78, "done": 35, "active": 20, "blocked": 3 }
  ],
  "team_breakdown": [
    { "assignee": "rahim", "sp": 18, "items": 5, "prs": 4 }
  ],
  "uc_epics": [
    { "id": "UC-1", "name": "Core Playback UI", "owner": "Rahim", "done_sp": 10, "total_sp": 25 }
  ],
  "blocked_items": [
    { "number": 142, "title": "Waiting on external API docs" }
  ],
  "whats_next": [
    { "number": 200, "title": "Slider a11y audit", "status": "In progress", "assignees": ["rahim"], "sp": 5 }
  ],
  "ai_summary": "2-3 paragraph narrative. See writing guidelines below."
}
```

Then post it:

```bash
cat /tmp/report.json | node .github/scripts/project-report/post-to-slack.js
```

## Writing style for ai_summary

- Direct, confident, friendly but not chatty
- Active voice, short sentences
- No filler: "In order to", "basically", "simply", "just", "very", "actually"
- No hedging: "might", "could", "perhaps"
- Use "we" and "our" for the project team
- Reference issues as #NUMBER, people as @name
- Cover: what shipped, velocity trends, risks/blockers, what to focus on next

## Gotchas

- **Status values are case-sensitive in jq.** Verify with `[.[].status.name] | unique`.
- **`--paginate` duplicates GraphQL results.** Always use manual cursor pagination.
- **Write jq to a file.** Shell quoting of `//` (jq's alternative operator) breaks in
  bash inline strings. Save to `/tmp/calc.jq` and use `jq -f`.
- **`fieldValueByName` needs aliases.** Can't appear twice in one GraphQL selection.
  Use `status: fieldValueByName(name: "Status")` and
  `points: fieldValueByName(name: "Story Points")`.
