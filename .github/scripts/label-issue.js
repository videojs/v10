import * as core from '@actions/core';
import * as github from '@actions/github';

const GH_TOKEN = process.env.GITHUB_TOKEN;

const pkgLabel = {
  'Core (@videojs/core)': 'pkg:core',
  'Icons (@videojs/icons)': 'pkg:icons',
  'HTML (@videojs/html)': 'pkg:html',
  'React (@videojs/react)': 'pkg:react',
  'Utils (@videojs/utils)': 'pkg:utils',
  'HTML Example': 'example:html',
  'React Example': 'example:react',
  'Next.js Example': 'example:next.js',
  Website: 'site',
};

const envLabel = {
  // Browsers
  chrome: 'browser:chrome',
  chromium: 'browser:chrome',
  firefox: 'browser:firefox',
  safari: 'browser:safari',
  edge: 'browser:edge',
  msedge: 'browser:edge',
  // OS
  macos: 'os:mac',
  'mac os': 'os:mac',
  darwin: 'os:mac',
  windows: 'os:windows',
  win32: 'os:windows',
  win10: 'os:windows',
  linux: 'os:linux',
  ubuntu: 'os:linux',
  debian: 'os:linux',
  android: 'os:android',
  ios: 'os:ios',
  iphone: 'os:ios',
  ipad: 'os:ios',
};

async function run() {
  try {
    const { issue } = github.context.payload;

    if (!issue || !issue.body) {
      console.log('No issue body found, skipping.');
      return;
    }

    const labels = new Set();

    const pkg = extractSection(issue, '### Which package(s) or projects are affected?');
    if (pkg) {
      for (const [option, label] of Object.entries(pkgLabel)) {
        if (pkg.includes(option)) {
          labels.add(label);
        }
      }
    }

    const env = extractSection(issue, '### Browser/OS/Node environment');
    if (env) {
      const envText = env.toLowerCase();
      for (const [keyword, label] of Object.entries(envLabel)) {
        if (envText.includes(keyword)) {
          labels.add(label);
        }
      }
    }

    if (labels.size === 0) {
      console.log('No matching labels found.');
      return;
    }

    console.log(`Matched labels: ${Array.from(labels).join(', ')}`);

    if (process.env.DRY_RUN === 'true') {
      console.log('⚠️ DRY RUN: Skipping API call.');
      return;
    }

    if (!GH_TOKEN) {
      throw new Error('GITHUB_TOKEN is not set');
    }

    const octokit = github.getOctokit(GH_TOKEN);

    await octokit.rest.issues.addLabels({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: issue.number,
      labels: Array.from(labels),
    });
  } catch (error) {
    core.setFailed(`Action failed with error: ${error}`);
  }
}

/**
 * @param {*} issue
 * @param {string} header
 */
function extractSection(issue, header) {
  const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`${escapedHeader}\\r?\\n([\\s\\S]*?)(?=\\r?\\n###|$)`, 'i');
  const match = issue.body.match(regex);
  return match ? match[1].trim() : null;
};

run();
