#!/usr/bin/env node
'use strict';

/**
 * scripts/set-base-titles.js
 *
 * Writes each base's full title (from issue #184, src/data/base-titles.json) into its issue as
 *
 *   <!-- meta:base title="FULL TITLE"--><!--/meta:base-->
 *
 * Only empty or still-generated bodies are replaced. A body with anything of yours in it is left
 * alone and listed. Dry run unless you pass --apply.
 *
 *   node scripts/set-base-titles.js [--apply]
 */

const { expectedPart } = require('./lib/schema');
const bases = require('../src/data/base-titles.json').map(({ number, title }) => ({ number, title, part_parent: expectedPart(number) }));
const { buildTemplate, buildTitleOnly } = require('./lib/base-template');
const { apiCall, fetchIssuesByLabel, sleep, OWNER, REPO } = require('./lib/gh');

const APPLY = process.argv.includes('--apply');
const norm = s => (s || '').replace(/\r\n/g, '\n').trim();
// the title line differs per body, so compare everything else
const withoutTitle = s => norm(s).replace(/title="[^\n]*"/, 'title=""');

function isGenerated(body, base) {
  if (!norm(body)) return true;
  const skeleton = buildTemplate('base', { title: base.title, number: base.number, part_parent: base.part_parent });
  return withoutTitle(body) === withoutTitle(skeleton);
}

function main() {
  console.log(APPLY ? '*** APPLYING ***\n' : '*** DRY RUN — add --apply to write ***\n');
  const issues = fetchIssuesByLabel('FOUNDATION BASE');
  const plan = [];
  const kept = [];
  issues.forEach(issue => {
    const m = /^\s*base\s+(\d+)\b/i.exec(issue.title || '');
    const base = m && bases.find(b => b.number === Number(m[1]));
    if (!base) return kept.push(`#${issue.number} "${issue.title}" — not a recognised base title`);
    const body = buildTitleOnly(base.title);
    if (norm(issue.body) === body) return;
    if (!isGenerated(issue.body, base)) return kept.push(`#${issue.number} Base ${base.number} — has your own content, left alone`);
    plan.push({ issue, base, body });
  });

  const missing = bases.filter(b => !issues.some(i => new RegExp(`^\\s*base\\s+${b.number}\\b`, 'i').test(i.title || '')));
  console.log(`${plan.length} bodies to write, ${issues.length - plan.length - kept.length} already correct`);
  if (kept.length) console.log('\nLeft alone:\n  ' + kept.join('\n  '));
  if (missing.length) console.log('\nNo issue found for: ' + missing.map(b => `Base ${b.number}`).join(', '));
  if (!APPLY) {
    plan.slice(0, 3).forEach(p => console.log(`\n#${p.issue.number} Base ${p.base.number} would become:\n${p.body}`));
    return;
  }
  plan.forEach(({ issue, base, body }) => {
    apiCall('PATCH', `/repos/${OWNER}/${REPO}/issues/${issue.number}`, { body });
    console.log(`  #${issue.number} Base ${base.number}`);
    sleep(600);
  });
  console.log('\nDone.');
}

main();
