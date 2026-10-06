#!/usr/bin/env node
'use strict';

// Parses one Foundation issue with the same code the sync uses and reports what
// is wrong with it as a single comment on the issue (created or updated in place,
// so edits never pile up comments). Clean issues with no earlier report get no comment.
//
//   ISSUE_NUMBER=83 node scripts/check-issue.js          comment on the issue
//   ISSUE_NUMBER=83 node scripts/check-issue.js --dry    print the report only

const { execFileSync } = require('child_process');
const { parseIssue, typeFromLabels } = require('./lib/issue-doc');
const { apiCall, OWNER, REPO } = require('./lib/gh');

const MARKER = '<!-- foundation-issue-check -->';
const DRY = process.argv.includes('--dry');
const number = Number(process.env.ISSUE_NUMBER || process.argv.find(a => /^\d+$/.test(a)));

const gh = args => JSON.parse(execFileSync('gh', ['api', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) || 'null');

function report(issue) {
  const { errors, warnings, doc } = parseIssue(issue);
  // Tags in a message would otherwise be read as hidden HTML comments.
  const list = items => items.map(i => `- ${i.replace(/</g, '&lt;').replace(/>/g, '&gt;')}`).join('\n');
  const parts = [];
  if (errors.length) parts.push(`**Errors** — the sync will skip this issue until they are fixed:\n${list(errors)}`);
  if (warnings.length) parts.push(`**Warnings** — the issue syncs, but check these:\n${list(warnings)}`);
  if (!parts.length) parts.push(`✅ No problems found${doc ? ` (${doc.type} ${doc.number === undefined ? '' : doc.number})` : ''}.`.replace(' )', ')'));
  return { clean: !errors.length && !warnings.length, text: `${MARKER}\n### Tag check\n\n${parts.join('\n\n')}\n\n<sub>Checked with the same parser as the site sync. Edit the issue to re-check.</sub>` };
}

function main() {
  if (!number) {
    console.error('Set ISSUE_NUMBER.');
    process.exit(1);
  }
  const issue = gh(['-X', 'GET', `/repos/${OWNER}/${REPO}/issues/${number}`]);
  if (issue.pull_request || !typeFromLabels(issue.labels)) {
    console.log(`#${number} is not a Foundation issue; nothing to check.`);
    return;
  }
  const { clean, text } = report(issue);
  console.log(text);
  if (DRY) return;

  const comments = gh(['--paginate', `/repos/${OWNER}/${REPO}/issues/${number}/comments?per_page=100`]);
  const previous = (Array.isArray(comments) ? comments : []).find(c => (c.body || '').startsWith(MARKER));
  if (previous) apiCall('PATCH', `/repos/${OWNER}/${REPO}/issues/comments/${previous.id}`, { body: text });
  else if (!clean) apiCall('POST', `/repos/${OWNER}/${REPO}/issues/${number}/comments`, { body: text });
}

if (require.main === module) main();

module.exports = { report };
