import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { canDiagnose, cleanup, covers, reportRuns, sameBranch } from '../e2e-triage.js';

const repo = { owner: 'videojs', repo: 'v10' };
const run = {
  id: 20,
  run_number: 20,
  run_attempt: 1,
  workflow_id: 1,
  event: 'push',
  head_branch: 'main',
  head_sha: 'passed',
  head_repository: { id: 1 },
  conclusion: 'success',
  status: 'completed',
  html_url: 'https://github.com/videojs/v10/actions/runs/20',
};
const failure = { ...run, id: 10, run_number: 10, head_sha: 'failed', conclusion: 'failure' };
const job = (name, conclusion = 'success') => ({ name, conclusion });
const report = {
  id: 30,
  node_id: 'comment30',
  user: { login: 'github-actions[bot]' },
  body: '<!-- e2e-failure-triage:10 -->\nDiagnosis',
};
const issue = {
  ...report,
  number: 40,
  body: '<!-- e2e-failure -->\n<!-- trigger-pr:5 -->\nhttps://github.com/videojs/v10/actions/runs/10',
};

function fixture(options = {}) {
  const current = options.run ?? run;
  const writes = [];
  const read = (fn) => async (params) => ({ data: fn(params) });
  const write = (name) => async (params) => {
    writes.push({ name, ...params });
  };
  const github = {
    rest: {
      actions: {
        getWorkflowRun: read(({ run_id }) =>
          run_id === current.id ? (options.live ?? current) : (options.failed ?? failure)
        ),
        listWorkflowRuns: read(() => options.runs ?? [current, failure]),
        listJobsForWorkflowRunAttempt: read(() => options.passed ?? [job('E2E (chromium)'), job('Registry consumers')]),
        listJobsForWorkflowRun: read(() => options.jobs ?? [job('E2E (chromium)', 'failure')]),
      },
      repos: {
        compareCommitsWithBasehead: read(() => ({ status: options.ancestry ?? 'ahead' })),
        listPullRequestsAssociatedWithCommit: read(
          () => options.pulls ?? [{ number: 5, state: 'open', head: { sha: current.head_sha, repo: { id: 1 } } }]
        ),
        listCommitCommentsForRepo: read(() => options.comments ?? [report]),
        updateCommitComment: write('commit'),
      },
      issues: {
        listForRepo: read(() => options.issues ?? [issue]),
        listComments: read(() => options.comments ?? [report]),
        updateComment: write('comment'),
        createComment: write('reply'),
        update: write('issue'),
      },
    },
    paginate: async (method, params) => (await method(params)).data,
    graphql: async (_, params) => {
      writes.push({ name: 'minimize', ...params });
    },
  };

  return { github, writes, current };
}

describe('sameBranch', () => {
  it('separates workflows, events, branches, and fork repositories', () => {
    assert.equal(sameBranch(run, failure), true);

    for (const change of [
      { workflow_id: 2 },
      { event: 'pull_request' },
      { head_branch: 'other' },
      { head_repository: { id: 2 } },
    ]) {
      assert.equal(sameBranch(run, { ...failure, ...change }), false);
    }
  });
});

describe('covers', () => {
  it('requires every failed job and an executed browser suite to pass', () => {
    const failed = [job('Registry consumers', 'failure'), job('Build for browser suites', 'failure')];

    assert.equal(covers(failed, [job('Registry consumers'), job('Build for browser suites')]), false);
    assert.equal(covers(failed, [job('Registry consumers'), job('Build for browser suites'), job('Sandbox')]), true);
    assert.equal(covers([job('Skin parity (video 1/2)', 'failure')], [job('E2E (chromium)')]), false);
    assert.equal(covers([job('E2E (webkit 1/2)', 'failure')], [job('E2E (webkit 1/2)', 'skipped')]), false);
    assert.equal(covers([], [job('Sandbox')]), false);
  });
});

describe('reportRuns', () => {
  it('reads comment markers and only marked issue links for this repository', () => {
    assert.deepEqual(reportRuns(report.body, 'videojs/v10'), [10]);
    assert.deepEqual(reportRuns(issue.body, 'videojs/v10'), [10]);
    assert.deepEqual(reportRuns(`${issue.body}\n<!-- e2e-failure-run:15 -->`, 'videojs/v10'), [15]);
    assert.deepEqual(reportRuns(issue.body, 'other/repo'), []);
    assert.deepEqual(reportRuns(run.html_url, 'videojs/v10'), []);
  });
});

describe('canDiagnose', () => {
  it('rejects outdated events and newer runs even when still in progress', async () => {
    for (const options of [
      { live: { ...run, run_attempt: 2 } },
      { live: { ...run, conclusion: 'failure' } },
      { runs: [run, { ...run, id: 21, run_number: 21, status: 'in_progress', conclusion: null }] },
    ]) {
      const { github } = fixture(options);

      assert.equal(await canDiagnose(github, repo, run), false);
    }
  });

  it('requires an open PR at the same head and repository', async () => {
    const prRun = { ...run, event: 'pull_request' };

    for (const change of [
      { state: 'closed' },
      { head: { sha: 'new', repo: { id: 1 } } },
      { head: { sha: run.head_sha, repo: { id: 2 } } },
    ]) {
      const { github } = fixture({
        run: prRun,
        pulls: [{ number: 5, state: 'open', head: { sha: run.head_sha, repo: { id: 1 } }, ...change }],
      });

      assert.equal(await canDiagnose(github, repo, prRun), false);
    }
  });
});

describe('cleanup', () => {
  it('closes main issues and annotates and minimizes commit comments', async () => {
    const { github, writes } = fixture();

    await cleanup(github, repo, run);
    assert.deepEqual(
      writes.map((write) => write.name),
      ['reply', 'issue', 'commit', 'minimize']
    );
    assert.equal(writes[1].state_reason, 'completed');
    assert.match(writes[2].body, /e2e-failure-resolved/);
    assert.match(writes[2].body, /actions\/runs\/20/);
  });

  it('only resolves PR comments for the same PR branch', async () => {
    const prRun = { ...run, event: 'pull_request', head_branch: 'feature' };
    const { github, writes } = fixture({
      run: prRun,
      failed: { ...failure, event: 'pull_request', head_branch: 'feature' },
    });

    await cleanup(github, repo, prRun);
    assert.deepEqual(
      writes.map((write) => write.name),
      ['comment', 'minimize']
    );
  });

  it('resolves a passing rerun with the same run ID using earlier failed jobs', async () => {
    const rerun = { ...run, id: 10, run_number: 10, run_attempt: 2 };
    const { github, writes } = fixture({ run: rerun, jobs: [job('E2E (chromium)', 'failure'), job('E2E (chromium)')] });

    await cleanup(github, repo, rerun);
    assert.equal(writes.length, 4);
  });

  it('leaves unrelated, human, and already resolved reports untouched', async () => {
    const comments = [
      { ...report, user: { login: 'human' } },
      { ...report, body: 'Ordinary comment' },
      { ...report, body: `${report.body}\n<!-- e2e-failure-resolved -->` },
    ];
    const { github, writes } = fixture({
      comments,
      issues: [
        { ...issue, user: { login: 'human' } },
        { ...issue, pull_request: {} },
      ],
    });

    await cleanup(github, repo, run);
    assert.deepEqual(writes, []);
  });

  it('does not resolve uncovered failures, newer reports, other branches, or divergent main history', async () => {
    for (const options of [
      { passed: [job('Registry consumers')] },
      { jobs: [job('E2E (webkit 1/2)', 'failure')] },
      { failed: { ...failure, head_branch: 'other' } },
      { failed: { ...failure, run_number: 21 } },
      { ancestry: 'diverged' },
      { runs: [run, { ...run, id: 21, run_number: 21 }] },
      { run: { ...run, conclusion: 'cancelled' } },
    ]) {
      const { github, writes, current } = fixture(options);

      await cleanup(github, repo, current);
      assert.deepEqual(writes, []);
    }
  });
});
