'use strict';

// Thin wrappers around `gh api`, shared by the bootstrap and migration scripts.

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const [OWNER, REPO] = (process.env.GITHUB_REPOSITORY || 'joshualinog/whatis.foundation').split('/');

/** POST/PATCH/… with a JSON body (sent from a temp file so no quoting is needed). */
function apiCall(method, endpoint, payload) {
  const tmpFile = path.join(os.tmpdir(), `ghapi-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(payload), 'utf8');
  try {
    const out = execFileSync('gh', ['api', '-X', method, endpoint, '--input', tmpFile], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return out.trim() ? JSON.parse(out) : {};
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore */ }
  }
}

/** Every issue (not pull request) with `label`, open and closed. */
function fetchIssuesByLabel(label) {
  const out = execFileSync(
    'gh',
    ['api', '--paginate', '--jq', '.[]', '-X', 'GET', `/repos/${OWNER}/${REPO}/issues`, '-f', `labels=${label}`, '-f', 'state=all', '-f', 'per_page=100'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  return out.split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(issue => !issue.pull_request);
}

/** Every issue (not pull request) in the repository, open and closed. */
function fetchAllIssues() {
  const out = execFileSync(
    'gh',
    ['api', '--paginate', '--jq', '.[]', '-X', 'GET', `/repos/${OWNER}/${REPO}/issues`, '-f', 'state=all', '-f', 'per_page=100'],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
  );
  return out.split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(issue => !issue.pull_request);
}

/** Synchronous sleep, to stay clear of GitHub's secondary rate limits. */
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

module.exports = { OWNER, REPO, apiCall, fetchIssuesByLabel, fetchAllIssues, sleep };
