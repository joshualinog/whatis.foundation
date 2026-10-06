#!/usr/bin/env node
'use strict';

/**
 * scripts/bootstrap-issues.js
 *
 * Creates the Foundation labels and the issues: one per base (0–101), one per
 * part (1–5), one per main division (1–2) and the course overview. Each body
 * is the authoring-language skeleton from scripts/lib/base-template.js: a
 * <!-- meta:TYPE --> wrapper, an empty <!-- block:NAME --> for every array
 * field, and a body block. Handwriting is then pasted into the issue;
 * scripts/sync-issues.js turns it into site data.
 *
 * Usage:
 *   node scripts/bootstrap-issues.js [--dry-run] [--only=bases|containers] [--start=<base number>]
 *   (containers = parts, divisions and the overview)
 */

const bases = require('../src/data/bases.js')();
const { buildTemplate } = require('./lib/base-template');
const { parseIssue } = require('./lib/issue-doc');
const course = require('../src/data/course.js')();

const DRY_RUN = process.argv.includes('--dry-run');
const startArg = process.argv.find(a => a.startsWith('--start='));
const START = startArg ? parseInt(startArg.split('=')[1], 10) : 0;
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.split('=')[1] : 'all';

const { OWNER, REPO, apiCall, sleep } = require('./lib/gh');

const LABEL_COMPONENT = 'FOUNDATION COURSE COMPONENT';
const LABEL = {
  base: 'FOUNDATION BASE',
  part: 'FOUNDATION PART',
  division: 'FOUNDATION DIVISION',
  overview: 'FOUNDATION COURSE OVERVIEW',
};

const LABELS = [
  { name: LABEL_COMPONENT, color: '0052cc', description: 'A component of the Foundation Course — consumed by the CMS workflow' },
  { name: LABEL.base, color: 'fbca04', description: 'A Foundation Course base issue (numbers 0–101)' },
  { name: LABEL.part, color: '0e8a16', description: 'One of the five parts of the Foundation Course' },
  { name: LABEL.division, color: 'd93f0b', description: 'One of the two main divisions of the Foundation Course' },
  { name: LABEL.overview, color: '6f42c1', description: 'The Foundation Course overview' },
];

function ensureLabel(label) {
  if (DRY_RUN) return console.log(`  [dry-run] label → ${label.name}`);
  try {
    apiCall('POST', `/repos/${OWNER}/${REPO}/labels`, label);
    console.log(`  created  → ${label.name}`);
  } catch (_) {
    try {
      apiCall('PATCH', `/repos/${OWNER}/${REPO}/labels/${encodeURIComponent(label.name)}`, { new_name: label.name, ...label });
      console.log(`  updated  → ${label.name}`);
    } catch (e) {
      console.log(`  skipped  → ${label.name}  (${e.message.split('\n')[0]})`);
    }
  }
}

function buildIssue(type, values, title) {
  const body = buildTemplate(type, values);
  // The generated body must round-trip through the real parser.
  const { errors } = parseIssue({ title, body, labels: [{ name: LABEL[type] }] });
  if (errors.length) throw new Error(`generated body for "${title}" is invalid: ${errors.join('; ')}`);
  return { type, title, body };
}

function planIssues() {
  const plan = [];
  if (ONLY !== 'containers') {
    bases
      .filter(b => b.number >= START)
      .forEach(b =>
        plan.push(buildIssue('base', { title: b.headline, long_title: b.long_title, number: b.number, part_parent: b.part_parent }, `Base ${b.number} — ${b.headline}`))
      );
  }
  if (ONLY !== 'bases' && START === 0) {
    plan.push(buildIssue('overview', { title: course.heading, short_description: course.description }, 'Course overview'));
    course.divisions.forEach(d =>
      plan.push(buildIssue('division', { title: d.title, number: d.number, short_description: d.summary }, `Division ${d.number} — ${d.title}`))
    );
    course.parts.forEach(p =>
      plan.push(buildIssue('part', { title: p.title, number: p.number, short_description: p.overview }, `Part ${p.number} — ${p.title}`))
    );
  }
  return plan;
}

function main() {
  if (DRY_RUN) console.log('\n*** DRY RUN — no GitHub API calls will be made ***\n');

  if (START === 0) {
    console.log('\n=== Creating labels ===');
    LABELS.forEach(ensureLabel);
  }

  const plan = planIssues();
  console.log(`\n=== Creating ${plan.length} issues ===`);
  for (const { type, title, body } of plan) {
    if (DRY_RUN) {
      console.log(`  [dry-run] ${title}`);
      continue;
    }
    const result = apiCall('POST', `/repos/${OWNER}/${REPO}/issues`, { title, body, labels: [LABEL_COMPONENT, LABEL[type]] });
    console.log(`  #${String(result.number).padStart(4)} → ${title}`);
    sleep(600);
  }
  console.log('\nDone.');
}

main();
