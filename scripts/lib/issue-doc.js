'use strict';

const { parseDocText } = require('./tag-parser');
const { DOC_TYPES, expectedPart, formatZodError } = require('./schema');
const baseTitles = require('../../src/data/base-titles.json');
const defaults = require('../../src/content/course-defaults');

const BASE_TITLE = new Map(baseTitles.map(t => [t.number, t.title]));

// Where a number may come from when the meta tag leaves it out.
const TITLE_NUMBER = {
  base: /^\s*base\s+(\d+)\b/i,
  part: /^\s*part\s+(\d+)\b/i,
  division: /^\s*(?:main\s+)?division\s+(\d+)\b/i,
};

function defaultTitle(type, number) {
  if (type === 'base') return BASE_TITLE.get(number);
  if (type === 'part') return (defaults.parts.find(p => p.number === number) || {}).title;
  if (type === 'division') return (defaults.divisions.find(d => d.number === number) || {}).title;
  return defaults.heading;
}

/**
 * The document type implied by an issue's labels, or null.
 * @param {Array<string|{name: string}>} labels
 */
function typeFromLabels(labels) {
  const names = (labels || []).map(l => (l.name || l));
  return Object.keys(DOC_TYPES).find(type => DOC_TYPES[type].labels.some(l => names.includes(l))) || null;
}

/**
 * Turn a GitHub issue into a validated base, part, division or overview.
 *
 * The type is the `meta:TYPE` written in the body. Without one it falls back
 * to the issue's label, then to base (a bare `<!-- meta -->` is a base). A
 * body that says one thing while its label says another is rejected, so a
 * pasted part can never overwrite a base.
 *
 * Omitted fields fall back sensibly: the number comes from a title such as
 * "Base 5" / "Part 2", the title from the canonical one, `part_parent` from
 * the base number.
 *
 * @param {{title?: string, body?: string, number?: number, html_url?: string, updated_at?: string, labels?: any[]}} issue
 * @returns {{doc: object|null, type: string|null, errors: string[], warnings: string[]}}
 */
function parseIssue(issue) {
  const labelType = typeFromLabels(issue.labels);
  const { written, type, raw, warnings, errors } = parseDocText(issue.body, { defaultType: labelType || 'base' });
  if (errors.length) return { doc: null, type, errors, warnings };

  if (written && labelType && written !== labelType) {
    return { doc: null, type, errors: [`the body says meta:${written} but the issue is labelled for a ${labelType}`], warnings };
  }

  if (raw.number === undefined && TITLE_NUMBER[type]) {
    const m = TITLE_NUMBER[type].exec(issue.title || '');
    if (m) raw.number = Number(m[1]);
  }
  if (typeof raw.number === 'number') {
    if (type === 'base' && raw.part_parent === undefined) {
      const part = expectedPart(raw.number);
      if (part !== undefined) raw.part_parent = part;
    }
  }
  if (raw.title === undefined) {
    const title = defaultTitle(type, raw.number);
    if (title) raw.title = title;
  }
  if (type !== 'overview' && raw.number === undefined) {
    const hint = TITLE_NUMBER[type] ? ` or start the issue title with "${type[0].toUpperCase() + type.slice(1)} <number>"` : '';
    return { doc: null, type, errors: [`number: add number="…" to <!-- meta:${type} -->${hint}`], warnings };
  }

  const result = DOC_TYPES[type].schema.safeParse(raw);
  if (!result.success) return { doc: null, type, errors: formatZodError(result.error), warnings };

  if (type === 'base' && typeof raw.part_parent === 'number' && expectedPart(raw.number) !== raw.part_parent) {
    warnings.push(`part_parent ${raw.part_parent} does not match the part base ${raw.number} belongs to`);
  }

  const doc = {
    ...result.data,
    type,
    issue: {
      number: issue.number,
      url: issue.html_url || '',
      updated_at: issue.updated_at || issue.created_at || '',
    },
  };
  return { doc, type, errors: [], warnings };
}

module.exports = { parseIssue, typeFromLabels };
