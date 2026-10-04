#!/usr/bin/env node
'use strict';

// Syncs the Foundation issues into src/content/:
//   FOUNDATION BASE (0–101)        → bases/NNN.json
//   FOUNDATION PART (1–5)          → parts/N.json
//   FOUNDATION DIVISION (1–2)      → divisions/N.json
//   FOUNDATION COURSE OVERVIEW     → overview.json
// The issue body is written in the tag language described in README.md. Its
// `meta:TYPE` tag decides what it is; it is validated before anything is written.
//
//   node scripts/sync-issues.js                    sync every labelled issue
//   ISSUE_NUMBER=12 node scripts/sync-issues.js    sync one issue (issue events)
//   node scripts/sync-issues.js delete 12          drop what came from issue 12

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { parseIssue } = require('./lib/issue-doc');
const { DOC_TYPES } = require('./lib/schema');

const [OWNER, REPO] = (process.env.GITHUB_REPOSITORY || 'joshualinog/whatis.foundation').split('/');
const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');

const pad = (n, width) => String(n).padStart(width, '0');
const OUTPUT = {
  base: doc => path.join('bases', `${pad(doc.number, 3)}.json`),
  part: doc => path.join('parts', `${doc.number}.json`),
  division: doc => path.join('divisions', `${doc.number}.json`),
  overview: () => 'overview.json',
};

// LABELS overrides the label list for every type (comma separated).
const LABELS = process.env.BASE_LABELS
  ? process.env.BASE_LABELS.split(',').map(s => s.trim())
  : [...new Set(Object.values(DOC_TYPES).flatMap(t => t.labels))];

function gh(args) {
  return execFileSync('gh', ['api', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function fetchLabelled() {
  const byNumber = new Map();
  LABELS.forEach(label => {
    const out = gh(['--paginate', '--jq', '.[]', '-X', 'GET', `/repos/${OWNER}/${REPO}/issues`, '-f', `labels=${label}`, '-f', 'state=all', '-f', 'per_page=100']);
    out.split('\n').filter(Boolean).forEach(line => {
      const issue = JSON.parse(line);
      if (!issue.pull_request) byNumber.set(issue.number, issue);
    });
  });
  return [...byNumber.values()];
}

function fetchSingle(number) {
  return JSON.parse(gh(['-X', 'GET', `/repos/${OWNER}/${REPO}/issues/${number}`]));
}

function isContentLabelled(issue) {
  const names = (issue.labels || []).map(l => l.name || l);
  return names.some(n => LABELS.includes(n));
}

// Every file this script has written, with the issue it came from.
function existingFiles() {
  const files = [path.join(CONTENT_DIR, 'overview.json')];
  ['bases', 'parts', 'divisions'].forEach(dir => {
    const full = path.join(CONTENT_DIR, dir);
    if (fs.existsSync(full)) fs.readdirSync(full).filter(f => f.endsWith('.json')).forEach(f => files.push(path.join(full, f)));
  });
  return files.filter(f => fs.existsSync(f)).map(file => ({ file, data: JSON.parse(fs.readFileSync(file, 'utf8')) }));
}

function removeForIssue(issueNumber, reason) {
  existingFiles()
    .filter(({ data }) => data.issue && data.issue.number === issueNumber)
    .forEach(({ file }) => {
      fs.unlinkSync(file);
      console.log(`Deleted ${path.relative(CONTENT_DIR, file)} (${reason})`);
    });
}

let failures = 0;

function writeIssue(issue) {
  const { doc, errors, warnings } = parseIssue(issue);
  warnings.forEach(w => console.log(`::warning title=Issue #${issue.number}::${w}`));
  if (!doc) {
    failures += 1;
    errors.forEach(e => console.log(`::error title=Issue #${issue.number} skipped::${e}`));
    return;
  }
  const rel = OUTPUT[doc.type](doc);
  const clash = existingFiles().find(({ file, data }) => file === path.join(CONTENT_DIR, rel) && data.issue && data.issue.number !== issue.number);
  if (clash) console.log(`::warning title=Issue #${issue.number}::replaces ${rel}, previously written from issue #${clash.data.issue.number}`);

  // Content that moved to another file (a changed number or type) must not leave a stale copy.
  removeForIssue(issue.number, 'rewritten');
  const target = path.join(CONTENT_DIR, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  console.log(`wrote ${rel} (${doc.type}) from issue #${issue.number}`);
}

function main() {
  if (process.argv[2] === 'delete') {
    removeForIssue(Number(process.argv[3]), 'issue deleted');
    return;
  }

  if (process.env.ISSUE_NUMBER) {
    const issue = fetchSingle(process.env.ISSUE_NUMBER);
    if (!issue.pull_request && isContentLabelled(issue)) writeIssue(issue);
    else removeForIssue(issue.number, 'label removed');
    return;
  }

  const issues = fetchLabelled();
  const current = new Set(issues.map(i => i.number));
  existingFiles().forEach(({ file, data }) => {
    if (!data.issue || !current.has(data.issue.number)) {
      fs.unlinkSync(file);
      console.log(`Deleted ${path.relative(CONTENT_DIR, file)}`);
    }
  });
  issues.sort((a, b) => a.number - b.number).forEach(writeIssue);
}

main();
if (failures) console.log(`${failures} issue(s) were skipped because of errors.`);
