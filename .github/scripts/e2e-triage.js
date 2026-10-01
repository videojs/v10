const marker = /<!-- e2e-failure-triage:(\d+) -->/;
const resolved = '<!-- e2e-failure-resolved -->';

export function sameBranch(a, b) {
  return (
    a.workflow_id === b.workflow_id &&
    a.event === b.event &&
    a.head_branch === b.head_branch &&
    a.head_repository?.id === b.head_repository?.id
  );
}

export function covers(failed, passed) {
  const failures = failed.filter((job) => job.conclusion === 'failure');

  return (
    failures.length > 0 &&
    passed.some((job) => /^(E2E \(|Sandbox$|Skin parity \()/.test(job.name) && job.conclusion === 'success') &&
    failures.every((job) => passed.some((next) => next.name === job.name && next.conclusion === 'success'))
  );
}

export function reportRuns(body, repo) {
  const id = body.match(/<!-- e2e-failure-run:(\d+) -->/)?.[1] ?? body.match(marker)?.[1];
  if (id) return [Number(id)];

  if (!body.includes('<!-- e2e-failure -->')) return [];

  const prefix = `https://github.com/${repo}/actions/runs/`;

  return [
    ...new Set(
      body
        .split(prefix)
        .slice(1)
        .map((part) => Number(part.match(/^\d+/)?.[0]))
        .filter(Boolean)
    ),
  ];
}

export async function isCurrent(github, repo, run) {
  const { data: current } = await github.rest.actions.getWorkflowRun({ ...repo, run_id: run.id });

  if (
    current.run_attempt !== run.run_attempt ||
    current.conclusion !== run.conclusion ||
    current.status !== 'completed'
  ) {
    return false;
  }

  const runs = await github.paginate(github.rest.actions.listWorkflowRuns, {
    ...repo,
    workflow_id: run.workflow_id,
    branch: run.head_branch,
    event: run.event,
    per_page: 100,
  });

  return !runs.some((next) => sameBranch(run, next) && next.run_number > run.run_number);
}

export async function pullForRun(github, repo, run) {
  const pulls = await github.paginate(github.rest.repos.listPullRequestsAssociatedWithCommit, {
    ...repo,
    commit_sha: run.head_sha,
    per_page: 100,
  });

  return pulls.find(
    (pull) => pull.state === 'open' && pull.head.sha === run.head_sha && pull.head.repo?.id === run.head_repository?.id
  );
}

export async function canDiagnose(github, repo, run) {
  if (!(await isCurrent(github, repo, run))) return false;

  return run.event !== 'pull_request' || Boolean(await pullForRun(github, repo, run));
}

export async function cleanup(github, repo, run) {
  if (run.conclusion !== 'success' || !(await isCurrent(github, repo, run))) return;

  const passed = await github.paginate(github.rest.actions.listJobsForWorkflowRunAttempt, {
    ...repo,
    run_id: run.id,
    attempt_number: run.run_attempt,
    per_page: 100,
  });
  const cache = new Map();

  async function recovered(id) {
    if (cache.has(id)) return cache.get(id);

    const { data: failed } = await github.rest.actions.getWorkflowRun({ ...repo, run_id: id });
    if (!sameBranch(failed, run) || failed.run_number > run.run_number) return false;

    // A later main revision must contain the failed revision, including after a force push.
    if (run.event === 'push' && failed.head_sha !== run.head_sha) {
      const { data: comparison } = await github.rest.repos.compareCommitsWithBasehead({
        ...repo,
        basehead: `${failed.head_sha}...${run.head_sha}`,
      });
      if (!['ahead', 'identical'].includes(comparison.status)) return false;
    }

    // Include earlier attempts: a successful rerun retains the original run ID.
    const jobs = await github.paginate(github.rest.actions.listJobsForWorkflowRun, {
      ...repo,
      run_id: id,
      filter: 'all',
      per_page: 100,
    });
    const result = covers(jobs, passed);

    cache.set(id, result);
    return result;
  }

  const botReport = (item) => item.user?.login === 'github-actions[bot]' && !item.body?.includes(resolved);
  const message = `Resolved: E2E tests passed in [this run](${run.html_url}).`;

  async function eligible(item) {
    if (!botReport(item)) return false;

    const ids = reportRuns(item.body ?? '', `${repo.owner}/${repo.repo}`);
    if (!ids.length) return false;

    for (const id of ids) {
      if (!(await recovered(id))) return false;
    }

    return true;
  }

  async function resolveComment(comment, commit = false) {
    if (!(await eligible(comment)) || !(await canDiagnose(github, repo, run))) return;

    const params = { ...repo, comment_id: comment.id, body: `${comment.body}\n\n${resolved}\n${message}` };

    if (commit) await github.rest.repos.updateCommitComment(params);
    else await github.rest.issues.updateComment(params);

    await github.graphql(
      `mutation($id: ID!) {
      minimizeComment(input: {subjectId: $id, classifier: RESOLVED}) { minimizedComment { isMinimized } }
    }`,
      { id: comment.node_id }
    );
  }

  if (run.event === 'pull_request') {
    const pull = await pullForRun(github, repo, run);
    if (!pull) return;

    const comments = await github.paginate(github.rest.issues.listComments, {
      ...repo,
      issue_number: pull.number,
      per_page: 100,
    });

    for (const comment of comments) await resolveComment(comment);
  } else if (run.event === 'push' && run.head_branch === 'main') {
    const issues = await github.paginate(github.rest.issues.listForRepo, { ...repo, state: 'open', per_page: 100 });

    for (const issue of issues) {
      if (
        issue.pull_request ||
        !issue.body?.includes('<!-- e2e-failure -->') ||
        !(await eligible(issue)) ||
        !(await isCurrent(github, repo, run))
      ) {
        continue;
      }

      await github.rest.issues.createComment({ ...repo, issue_number: issue.number, body: message });
      await github.rest.issues.update({
        ...repo,
        issue_number: issue.number,
        state: 'closed',
        state_reason: 'completed',
      });
    }

    const comments = await github.paginate(github.rest.repos.listCommitCommentsForRepo, { ...repo, per_page: 100 });

    for (const comment of comments) await resolveComment(comment, true);
  }
}
