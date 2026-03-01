/**
 * Reads a report JSON from stdin and posts it to Slack as a Block Kit message.
 *
 * Usage: cat /tmp/report.json | node post-to-slack.js
 *
 * Expects WEEKLY_REPORT_SLACK_WEBHOOK_URL environment variable.
 * No external dependencies — uses only Node built-ins.
 */

import { readFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Slack Block Kit helpers
// ---------------------------------------------------------------------------

const REPO = 'videojs/v10';
const BOARD_URL = 'https://github.com/orgs/videojs/projects/7/views/2';

/** Round SP values to avoid floating point artifacts like 303.669999... */
function sp(value) {
  return Math.round(value);
}

function pct(value, total) {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

function statusEmoji(status) {
  if (status === 'Done') return '🟢';
  if (status === 'Blocked') return '🔴';
  if (['In progress', 'Up next', 'Ready for review'].includes(status)) return '🔵';
  return '⚪';
}

function header(text) {
  return { type: 'header', text: { type: 'plain_text', text, emoji: true } };
}

function section(text) {
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

function divider() {
  return { type: 'divider' };
}

function context(text) {
  return { type: 'context', elements: [{ type: 'mrkdwn', text }] };
}

// ---------------------------------------------------------------------------
// Build Slack blocks from report JSON
// ---------------------------------------------------------------------------

function buildBlocks(report) {
  const blocks = [];
  const { velocity: v, beta_progress: bp, without_spf: ns } = report;

  // Header
  blocks.push(header('Video.js 10 Weekly Report'));
  blocks.push(context(`*${report.header}*`));
  blocks.push(divider());

  // Velocity
  blocks.push(section(
    `*This week*\n` +
    `• Story Points completed: *${sp(v.sp_completed)}*\n` +
    `• Items completed: *${v.items_completed}*\n` +
    `• PRs merged: *${v.prs_merged}*\n` +
    `• Issues closed: *${v.issues_closed}*`,
  ));
  blocks.push(divider());

  // Beta progress by status
  const statusLines = bp.by_status
    .sort((a, b) => b.sp - a.sp)
    .map((s) => `${statusEmoji(s.status)} ${s.status}: *${sp(s.sp)} SP* (${pct(s.sp, bp.total_sp)}) — ${s.count} items`)
    .join('\n');
  blocks.push(section(`*Beta progress* — ${bp.total_items} items, ${sp(bp.total_sp)} SP\n${statusLines}`));

  // Without SPF
  blocks.push(section(
    `*Without SPF* — ${sp(ns.total_sp)} SP\n` +
    `🟢 Done: *${sp(ns.done_sp)} SP* (${pct(ns.done_sp, ns.total_sp)})\n` +
    `🔵 Active: *${sp(ns.active_sp)} SP* (${pct(ns.active_sp, ns.total_sp)})\n` +
    `🔴 Blocked: *${sp(ns.blocked_sp)} SP* (${pct(ns.blocked_sp, ns.total_sp)})\n` +
    `⚪ Unplanned: *${sp(ns.unplanned_sp)} SP* (${pct(ns.unplanned_sp, ns.total_sp)})`,
  ));
  blocks.push(divider());

  // Workstreams
  if (report.by_workstream.length > 0) {
    const wsLines = report.by_workstream
      .sort((a, b) => b.total - a.total)
      .map((ws) => `• ${ws.name}: *${sp(ws.total)} SP* — ${pct(ws.done, ws.total)} done`)
      .join('\n');
    blocks.push(section(`*By workstream*\n${wsLines}`));
    blocks.push(divider());
  }

  // Team breakdown
  if (report.team_breakdown.length > 0) {
    const teamLines = report.team_breakdown
      .sort((a, b) => b.sp - a.sp)
      .map((t) => `• @${t.assignee}: *${sp(t.sp)} SP* (${t.items} items, ${t.prs} PRs)`)
      .join('\n');
    blocks.push(section(`*Team breakdown*\n${teamLines}`));
    blocks.push(divider());
  }

  // UC Epics
  if (report.uc_epics.length > 0) {
    const epicLines = report.uc_epics
      .map((e) => `• ${e.id} ${e.name}: *${sp(e.done_sp)}/${sp(e.total_sp)} SP* (${pct(e.done_sp, e.total_sp)}) — ${e.owner}`)
      .join('\n');
    blocks.push(section(`*Use case epics*\n${epicLines}`));
    blocks.push(divider());
  }

  // Blocked items
  if (report.blocked_items.length > 0) {
    const blockedLines = report.blocked_items
      .map((i) => `• <https://github.com/${REPO}/issues/${i.number}|#${i.number}> ${i.title}`)
      .join('\n');
    blocks.push(section(`*Blocked*\n${blockedLines}`));
    blocks.push(divider());
  }

  // What's next (cap at 10 to stay within block limits)
  if (report.whats_next.length > 0) {
    const items = report.whats_next.slice(0, 10);
    const lines = items
      .map((i) => {
        const assignees = (i.assignees || []).map((a) => `@${a}`).join(', ') || 'unassigned';
        return `${statusEmoji(i.status)} <https://github.com/${REPO}/issues/${i.number}|#${i.number}> ${i.title} (${sp(i.sp)} SP, ${assignees})`;
      })
      .join('\n');
    const overflow = report.whats_next.length > 10
      ? `\n_…and ${report.whats_next.length - 10} more_`
      : '';
    blocks.push(section(`*What's next*\n${lines}${overflow}`));
    blocks.push(divider());
  }

  // AI summary
  if (report.ai_summary) {
    blocks.push(section(`*Analysis*\n${report.ai_summary}`));
    blocks.push(divider());
  }

  // Footer
  blocks.push(context(`<${BOARD_URL}|View project board>`));

  // Slack limit: 50 blocks max
  if (blocks.length > 50) {
    const truncated = blocks.slice(0, 49);
    truncated.push(context('_Report truncated — too many sections._'));
    return truncated;
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Post to Slack webhook
// ---------------------------------------------------------------------------

async function post(webhookUrl, payload) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack webhook failed (${res.status}): ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const webhookUrl = process.env.WEEKLY_REPORT_SLACK_WEBHOOK_URL;
if (!webhookUrl) {
  console.error('WEEKLY_REPORT_SLACK_WEBHOOK_URL is not set');
  process.exit(1);
}

// Read JSON from stdin
const input = readFileSync('/dev/stdin', 'utf-8').trim();

let report;
try {
  report = JSON.parse(input);
} catch (err) {
  console.error('Failed to parse report JSON:', err.message);
  console.error('Input (first 500 chars):', input.slice(0, 500));
  process.exit(1);
}

const blocks = buildBlocks(report);
const fallback = `Video.js 10 Weekly Report — ${report.header}`;

await post(webhookUrl, { text: fallback, blocks });
console.log(`Posted to Slack: ${report.header}`);
