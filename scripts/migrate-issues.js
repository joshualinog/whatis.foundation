#!/usr/bin/env node
'use strict';

/**
 * scripts/migrate-issues.js
 *
 * One-off, in-place migration of the existing issues to the base / part /
 * division / overview scheme, keeping issue numbers, comments and photos.
 *
 * BASES   "Meeting N …" (label FOUNDATION MEETING) → "Base N — title" (FOUNDATION BASE).
 *         The old numbering ran 0–100 with no nexus, so from old 30 onwards every
 *         number moves up by one (old 30 → Base 31 … old 100 → Base 101); Base 30
 *         (Jesus) has no old issue and is created.
 * PARTS   "Part N — … — Overview" (FOUNDATION PART OVERVIEW), or any issue titled
 *         "Part N", → "Part N — title" (FOUNDATION PART).
 * DIVISIONS  issues titled "Division N" / "Main Division N" (e.g. #185, #186)
 *         → "Division N — title" (FOUNDATION DIVISION).
 * OVERVIEW   the issue labelled FOUNDATION COURSE OVERVIEW → "Course overview".
 *
 * An untouched generated stub (old YAML front matter, no comments, no images)
 * gets the new tag skeleton as its body. Anything that looks edited keeps its
 * body — the freeform text simply becomes the notes — and is listed for review.
 * Missing numbers are created. Issues it cannot classify are reported, never touched.
 *
 * It is a dry run unless you pass --apply.
 *
 *   node scripts/migrate-issues.js [--apply] [--skip=184,187] [--only=bases|containers]
 */

const bases = require('../src/data/bases.js')();
const course = require('../src/data/course.js')();
const { buildTemplate } = require('./lib/base-template');
const { parseIssue } = require('./lib/issue-doc');
const { apiCall, fetchAllIssues, sleep, OWNER, REPO } = require('./lib/gh');

const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '--only=all').split('=')[1];
// The two schema-planning issues are never content.
const SKIP = new Set(
  ((process.argv.find(a => a.startsWith('--skip=')) || '--skip=184,187').split('=')[1] || '').split(',').filter(Boolean).map(Number)
);

const LABEL = {
  component: 'FOUNDATION COURSE COMPONENT',
  base: 'FOUNDATION BASE',
  part: 'FOUNDATION PART',
  division: 'FOUNDATION DIVISION',
  overview: 'FOUNDATION COURSE OVERVIEW',
};
const LEGACY = { meeting: 'FOUNDATION MEETING', partOverview: 'FOUNDATION PART OVERVIEW' };

const labelNames = issue => (issue.labels || []).map(l => l.name || l);
const hasLabel = (issue, name) => labelNames(issue).includes(name);

// ── what each target looks like ─────────────────────────────────────────────

const baseByNumber = new Map(bases.map(b => [b.number, b]));
const newBaseNumber = old => (old <= 29 ? old : old + 1);

const targets = {
  base: n => ({ title: `Base ${n} — ${baseByNumber.get(n).headline}`, values: { title: baseByNumber.get(n).title, number: n, part_parent: baseByNumber.get(n).part_parent } }),
  part: n => {
    const p = course.parts.find(x => x.number === n);
    return { title: `Part ${n} — ${p.title}`, values: { title: p.title, number: n, short_description: p.overview } };
  },
  division: n => {
    const d = course.divisions.find(x => x.number === n);
    return { title: `Division ${n} — ${d.title}`, values: { title: d.title, number: n, short_description: d.summary } };
  },
  overview: () => ({ title: 'Course overview', values: { title: course.heading, short_description: course.description } }),
};

function skeleton(type, number) {
  const { title, values } = targets[type](number);
  const body = buildTemplate(type, values);
  const { errors } = parseIssue({ title, body, labels: [{ name: LABEL[type] }] });
  if (errors.length) throw new Error(`generated body for ${title} is invalid: ${errors.join('; ')}`);
  return body;
}

// A generated stub that has not been touched since the old bootstrap created it.
function isUntouchedStub(issue) {
  const body = issue.body || '';
  return (
    issue.comments === 0 &&
    /Edit this issue to update the/.test(body) &&
    /^\s*---\r?\n/.test(body) &&
    !/!\[|<img|user-attachments/i.test(body)
  );
}

// ── classification ──────────────────────────────────────────────────────────

function classifyContainer(issue) {
  if (hasLabel(issue, LEGACY.meeting) || hasLabel(issue, LABEL.base)) return null;
  const title = issue.title || '';
  let m = /^\s*(?:main\s+)?division\s+([12])\b/i.exec(title);
  if (m) return { type: 'division', number: Number(m[1]) };
  m = /^\s*part\s+([1-5])\b/i.exec(title);
  if (m) return { type: 'part', number: Number(m[1]) };
  if (hasLabel(issue, LEGACY.partOverview)) {
    m = /part_number:\s*(\d)/.exec(issue.body || '');
    if (m) return { type: 'part', number: Number(m[1]) };
  }
  if (hasLabel(issue, LABEL.overview)) return { type: 'overview', number: null };
  return null;
}

function main() {
  console.log(APPLY ? '*** APPLYING changes ***\n' : '*** DRY RUN — nothing is changed (add --apply) ***\n');

  const all = fetchAllIssues().filter(i => !SKIP.has(i.number)).sort((a, b) => a.number - b.number);
  const plan = []; // { issue, type, number, stub, labels, kind }
  const skipped = [];
  const taken = { base: new Map(), part: new Map(), division: new Map(), overview: new Map() }; // number -> issue number

  const claim = (type, number, issue) => {
    const key = number === null ? 0 : number;
    if (taken[type].has(key)) {
      skipped.push(`#${issue.number} "${issue.title}" — ${type}${number === null ? '' : ' ' + number} already has issue #${taken[type].get(key)}`);
      return false;
    }
    taken[type].set(key, issue.number);
    return true;
  };

  // Issues already in the new scheme keep their slot.
  all.filter(i => hasLabel(i, LABEL.base)).forEach(issue => {
    const m = /^\s*base\s+(\d+)\b/i.exec(issue.title || '');
    if (m) taken.base.set(Number(m[1]), issue.number);
  });

  if (ONLY !== 'containers') {
    all.filter(i => hasLabel(i, LEGACY.meeting)).forEach(issue => {
      const m = /^\s*meeting\s+(\d+)\b/i.exec(issue.title || '');
      if (!m) return skipped.push(`#${issue.number} "${issue.title}" — title does not start with "Meeting <n>"`);
      const old = Number(m[1]);
      const number = newBaseNumber(old);
      if (!baseByNumber.has(number)) return skipped.push(`#${issue.number} "${issue.title}" — would become base ${number}, which does not exist`);
      if (!claim('base', number, issue)) return;
      plan.push({ issue, type: 'base', number, from: `Meeting ${old}`, stub: isUntouchedStub(issue), remove: [LEGACY.meeting] });
    });
  }

  if (ONLY !== 'bases') {
    all.forEach(issue => {
      const found = classifyContainer(issue);
      if (!found) return;
      if (!claim(found.type, found.number, issue)) return;
      plan.push({
        issue,
        type: found.type,
        number: found.number,
        from: `"${issue.title}"`,
        stub: isUntouchedStub(issue),
        remove: [LEGACY.partOverview],
      });
    });
  }

  // Unclassified issues are listed so nothing is silently ignored.
  const planned = new Set(plan.map(p => p.issue.number));
  const unclassified = all.filter(i => !planned.has(i.number) && !hasLabel(i, LABEL.base) && !skipped.some(s => s.startsWith(`#${i.number} `)));

  const missing = [];
  if (ONLY !== 'containers') bases.forEach(b => !taken.base.has(b.number) && missing.push({ type: 'base', number: b.number }));
  if (ONLY !== 'bases') {
    if (!taken.overview.has(0)) missing.push({ type: 'overview', number: null });
    course.divisions.forEach(d => !taken.division.has(d.number) && missing.push({ type: 'division', number: d.number }));
    course.parts.forEach(p => !taken.part.has(p.number) && missing.push({ type: 'part', number: p.number }));
  }

  // ── report ────────────────────────────────────────────────────────────────
  ['base', 'part', 'division', 'overview'].forEach(type => {
    const rows = plan.filter(p => p.type === type);
    if (!rows.length) return;
    console.log(`${type.toUpperCase()}S — ${rows.length} to update`);
    rows.forEach(p =>
      console.log(`  #${String(p.issue.number).padEnd(4)} ${p.from} → ${targets[type](p.number).title}  [${p.stub ? 'untouched stub: new skeleton body' : 'EDITED: body kept, review it'}]`)
    );
  });
  if (skipped.length) {
    console.log('\nSkipped (needs a human):');
    skipped.forEach(s => console.log('  ' + s));
  }
  console.log(`\nTo be created: ${missing.length ? missing.map(m => (m.number === null ? 'overview' : `${m.type} ${m.number}`)).join(', ') : 'nothing'}`);
  const edited = plan.filter(p => !p.stub);
  if (edited.length) console.log(`\nReview after applying (body kept as notes): ${edited.map(p => '#' + p.issue.number).join(', ')}`);
  if (unclassified.length) {
    console.log(`\nLeft alone (not part of the course): ${unclassified.length} other issue(s), e.g. ${unclassified.slice(0, 5).map(i => '#' + i.number).join(', ')}`);
  }

  if (!APPLY) return;

  // ── apply ─────────────────────────────────────────────────────────────────
  console.log('\nApplying…');
  plan.forEach(({ issue, type, number, stub, remove }) => {
    const { title } = targets[type](number);
    const labels = [...new Set([...labelNames(issue).filter(l => !remove.includes(l)), LABEL.component, LABEL[type]])];
    const payload = { title, labels };
    if (stub) payload.body = skeleton(type, number);
    apiCall('PATCH', `/repos/${OWNER}/${REPO}/issues/${issue.number}`, payload);
    console.log(`  updated #${issue.number} → ${title}`);
    sleep(600);
  });
  missing.forEach(({ type, number }) => {
    const { title } = targets[type](number);
    const result = apiCall('POST', `/repos/${OWNER}/${REPO}/issues`, { title, body: skeleton(type, number), labels: [LABEL.component, LABEL[type]] });
    console.log(`  created #${result.number} → ${title}`);
    sleep(600);
  });
  console.log('\nDone. Run the "Sync Issues to Data" workflow (or wait for the next edit) to refresh the site.');
}

main();
