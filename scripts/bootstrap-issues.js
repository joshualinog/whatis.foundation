#!/usr/bin/env node
/**
 * scripts/bootstrap-issues.js
 *
 * One-time bootstrap: creates Foundation Course labels and GitHub issues.
 *
 * Labels created:
 *   FOUNDATION COURSE COMPONENT  — base label on every issue
 *   FOUNDATION MEETING           — meetings 0–100 (101 issues)
 *   FOUNDATION COURSE OVERVIEW   — 1 course overview issue
 *   FOUNDATION PART OVERVIEW     — 5 part overview issues
 *
 * Usage:
 *   node scripts/bootstrap-issues.js [--dry-run]
 */

'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const DRY_RUN   = process.argv.includes('--dry-run');
const startArg  = process.argv.find(a => a.startsWith('--start='));
const START_MTG = startArg ? parseInt(startArg.split('=')[1], 10) : 0;

const OWNER = 'joshualinog';
const REPO  = 'whatis.foundation';

// ── Label names ───────────────────────────────────────────────────────────────
const LABEL_BASE    = 'FOUNDATION COURSE COMPONENT';
const LABEL_MEETING = 'FOUNDATION MEETING';
const LABEL_COURSE  = 'FOUNDATION COURSE OVERVIEW';
const LABEL_PART    = 'FOUNDATION PART OVERVIEW';

const LABELS = [
  {
    name: LABEL_BASE,
    color: '0052cc',
    description: 'A component of the Foundation Course — consumed by the CMS workflow',
  },
  {
    name: LABEL_MEETING,
    color: 'fbca04',
    description: 'A Foundation Course meeting issue (numbers 0–100)',
  },
  {
    name: LABEL_COURSE,
    color: '6f42c1',
    description: 'The Foundation Course overall overview issue',
  },
  {
    name: LABEL_PART,
    color: '0e8a16',
    description: 'Overview issue for one part of the Foundation Course',
  },
];

// ── Course data ───────────────────────────────────────────────────────────────
const course = require('../src/data/course.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * POST or PATCH to the GitHub API using a temp JSON file as the request body.
 * Falls back gracefully on "already_exists" for label creation.
 */
function apiCall(method, endpoint, payload) {
  const tmpFile = path.join(
    os.tmpdir(),
    `ghapi-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );
  fs.writeFileSync(tmpFile, JSON.stringify(payload), 'utf8');
  try {
    const out = execSync(
      `gh api -X ${method} "${endpoint}" --input "${tmpFile}"`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return JSON.parse(out);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore */ }
  }
}

/** Synchronous sleep via Atomics (avoids child-process overhead). */
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Create or update a label, swallowing 422 duplicate-name errors.
 */
function ensureLabel(label) {
  if (DRY_RUN) {
    console.log(`  [dry-run] label → ${label.name}`);
    return;
  }
  try {
    apiCall('POST', `/repos/${OWNER}/${REPO}/labels`, {
      name:        label.name,
      color:       label.color,
      description: label.description,
    });
    console.log(`  created  → ${label.name}`);
  } catch (err) {
    // 422 means the label already exists — patch it to keep color/description current
    try {
      apiCall('PATCH', `/repos/${OWNER}/${REPO}/labels/${encodeURIComponent(label.name)}`, {
        new_name:    label.name,
        color:       label.color,
        description: label.description,
      });
      console.log(`  updated  → ${label.name}`);
    } catch (e2) {
      console.log(`  skipped  → ${label.name}  (${e2.message.split('\n')[0]})`);
    }
  }
}

/**
 * Build a YAML front-matter block from a plain object.
 * All keys are already lowercase_snake_case by convention.
 */
function frontMatter(data) {
  const lines = ['---'];
  for (const [key, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      if (val.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        val.forEach(v => lines.push(`  - ${JSON.stringify(v)}`));
      }
    } else if (typeof val === 'number') {
      lines.push(`${key}: ${val}`);
    } else {
      lines.push(`${key}: ${JSON.stringify(String(val))}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

let issueCount = 0;

/**
 * Create a single GitHub issue.
 */
function createIssue(title, body, labels) {
  issueCount += 1;
  if (DRY_RUN) {
    console.log(`  [dry-run] #${String(issueCount).padStart(3)} → ${title}`);
    return { number: issueCount };
  }
  const result = apiCall('POST', `/repos/${OWNER}/${REPO}/issues`, {
    title,
    body,
    labels,
  });
  console.log(`  #${String(result.number).padStart(4)} → ${title}`);
  // Small courtesy delay — avoids secondary-rate-limit bursts
  sleep(600);
  return result;
}

// ── Build the flat meetings array [0 .. 100] ──────────────────────────────────

function buildMeetings() {
  const list = [];

  // Meeting 0 — Introduction
  list.push({
    number:            0,
    title:             course.intro.title,
    short_description: course.intro.description,
    long_description:  course.intro.details,
    part_parent:       0,
  });

  // Parts 1–5 (meetings 1–99)
  for (const part of course.parts) {
    for (const m of part.meetings) {
      list.push({
        number:            m.number,
        title:             m.title,
        short_description: m.description,
        long_description:  m.details,
        part_parent:       part.number,
      });
    }
  }

  // Meeting 100 — Outro
  list.push({
    number:            100,
    title:             course.outro.title,
    short_description: course.outro.description,
    long_description:  course.outro.description,
    part_parent:       0,
  });

  return list;
}

// ── Issue body builders ───────────────────────────────────────────────────────

function buildCourseOverviewBody() {
  const fm = frontMatter({
    title:             'WHAT IS. FOUNDATION?',
    subtitle:          'A Sacred Educational Course',
    short_description: 'A 99-meeting course built on a parable of light, the prism, the tablets, and the rainbow staircase.',
    long_description:  'God is light. The prism guides our travel. The tablets carry the ten words. The rainbow is a staircase of light. Guided forward, we become light.',
    total_meetings:    101,
    part_count:        5,
    google_docs_url:   '',
    google_slides_url: '',
    main_image:        '',
  });

  return `${fm}

## Course Overview

A 99-meeting course built on a parable of light, the prism, the tablets, and the rainbow staircase.

God is light. The prism guides our travel. The tablets carry the ten words. The rainbow is a staircase of light. Guided forward, we become light.

### Structure

| Part | Title | Meetings |
|------|-------|----------|
| 0 | Introduction | Meeting 0 |
| 1 | God is Light | Meetings 1–7 |
| 2 | The Prism | Meetings 8–12 |
| 3 | The Tablets | Meetings 13–22 |
| 4 | The Rainbow | Meetings 23–29 |
| 5 | We Become Light | Meetings 30–99 |
| — | Outro | Meeting 100 |

---

*Edit this issue to update the course overview page content. All issues labeled \`FOUNDATION COURSE COMPONENT\` are consumed by the site build.*
`;
}

function buildPartOverviewBody(part) {
  const nums  = part.meetings.map(m => m.number);
  const start = Math.min(...nums);
  const end   = Math.max(...nums);

  const fm = frontMatter({
    part_number:         part.number,
    title:               part.title,
    subtitle:            part.subtitle || `Meetings ${start}–${end}`,
    short_description:   part.overview,
    long_description:    part.overview,
    meeting_range_start: start,
    meeting_range_end:   end,
    meeting_count:       nums.length,
    color:               part.color || '',
    main_image:          '',
    google_docs_url:     '',
    google_slides_url:   '',
  });

  const table = part.meetings
    .map(m => `| ${m.number} | ${m.title} |`)
    .join('\n');

  return `${fm}

## Part ${part.number} — ${part.title}

${part.overview}

### Meetings in This Part

| # | Title |
|---|-------|
${table}

---

*Edit this issue to update the Part ${part.number} overview page content.*
`;
}

function buildMeetingBody(m) {
  const fm = frontMatter({
    title:             m.title,
    number:            m.number,
    short_description: m.short_description,
    long_description:  m.long_description,
    google_docs_url:   '',
    google_slides_url: '',
    main_image:        '',
    images:            [],
    main_video:        '',
    videos:            [],
    part_parent:       m.part_parent,
    scriptures:        [],
  });

  return `${fm}

## Meeting ${m.number} — ${m.title}

> *${m.short_description}*

${m.long_description}

---

*Edit this issue to update the content for Meeting ${m.number}. The body of this issue is carried over as page content. Comments are enabled via Giscus.*
`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  if (DRY_RUN) console.log('\n*** DRY RUN — no GitHub API calls will be made ***\n');

  if (START_MTG > 0) {
    // ── Resume mode: only create missing meetings ──────────────────────────
    console.log(`\n=== Resume mode — creating meetings ${START_MTG}–100 ===`);
    const meetings = buildMeetings().filter(m => m.number >= START_MTG);
    console.log(`    ${meetings.length} meetings to create…`);
    for (const m of meetings) {
      createIssue(
        `Meeting ${m.number} — ${m.title}`,
        buildMeetingBody(m),
        [LABEL_BASE, LABEL_MEETING]
      );
    }
  } else {
    // ── Full bootstrap ────────────────────────────────────────────────────
    // ── Step 1: Labels ──────────────────────────────────────────────────────
    console.log('\n=== Step 1/3 — Creating labels ===');
    for (const label of LABELS) {
      ensureLabel(label);
    }

    // ── Step 2: Course overview issue ──────────────────────────────────────
    console.log('\n=== Step 2/3 — Creating course overview issue ===');
    createIssue(
      'WHAT IS. FOUNDATION? — Course Overview',
      buildCourseOverviewBody(),
      [LABEL_BASE, LABEL_COURSE]
    );

    // ── Step 3a: Part overview issues (5) ─────────────────────────────────
    console.log('\n=== Step 3/3 — Creating part overview issues (5) ===');
    for (const part of course.parts) {
      createIssue(
        `Part ${part.number} — ${part.title} — Overview`,
        buildPartOverviewBody(part),
        [LABEL_BASE, LABEL_PART]
      );
    }

    // ── Step 3b: Meeting issues (101) ──────────────────────────────────────
    console.log('\n=== Step 3/3 — Creating meeting issues (101) ===');
    const meetings = buildMeetings();
    console.log(`    ${meetings.length} meetings to create…`);
    for (const m of meetings) {
      createIssue(
        `Meeting ${m.number} — ${m.title}`,
        buildMeetingBody(m),
        [LABEL_BASE, LABEL_MEETING]
      );
    }
  }

  console.log(`\n✓ Done. ${issueCount} issues ${DRY_RUN ? 'would be' : 'were'} created.`);
}

main();
