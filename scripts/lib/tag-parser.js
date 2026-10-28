'use strict';

// Parser for the Foundation authoring language (see the PDF referenced in
// issue #187). Content lives in a GitHub issue body as HTML comment tags,
// which are invisible when the issue is rendered:
//
//   <!-- meta:base title="God is Light" number="1" part_parent="1" short_description="..." -->
//   ...blocks...
//   <!-- /meta:base -->
//
// `meta:TYPE` (base, part, division, overview) says what the issue is and may
// wrap the blocks or stand alone; a bare `<!-- meta ... -->` means base.
//
//   <!-- block:board_game_content -->
//   <!-- item:game title="Catan" url="https://..." -->
//   Inner body text becomes the item's text.
//   <!-- /item:game -->
//   <!-- /block:board_game_content -->
//
// Anything inside <!-- … --> is invisible on GitHub, so a long value is better
// written as a visible field. The text between the tags is the value and shows
// up in the rendered issue. `long_title` is the full handwritten title; it is
// its own field, apart from `title` (which defaults to the issue's title) so a
// long title never has to fit in a GitHub issue title:
//
//   <!-- field:long_title -->God is Light, Light is Love, Being Light<!-- /field:long_title -->
//   (<!-- base:long_title -->…<!-- /base:long_title --> is the same thing; base: part: division: overview: all work as field:)
//   <!-- field:long_description -->
//   Any **markdown** you like.
//   <!-- /field:long_description -->
//
// Pass 1 extracts the tags into a plain object (before Zod validation).
// Pass 2 treats everything that is not a tag as the freeform base_body.
// Inside a known block any `item:*` alias is accepted (item:game, item:activity…).

const { BLOCK_FIELDS, DOC_TYPES, resolveType } = require('./schema');

const TAG = /<!--\s*(\/)?\s*(meta|block|item|field|base|part|division|overview)\b(?:\s*:\s*([A-Za-z0-9_-]+))?([\s\S]*?)-->/g;
const ATTR = /([A-Za-z_][\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;

const NUMERIC_ATTRS = new Set(['order', 'order_parent', 'number', 'part_parent']);
const BOOLEAN_ATTRS = new Set(['essential', 'main_image', 'main_video']);
const LIST_ATTRS = new Set(['base_prop_refs', 'image_urls', 'video_urls', 'audio_urls', 'track_urls', 'references', 'images']);

const fieldName = name => String(name).toLowerCase().replace(/-/g, '_');

function coerce(key, value) {
  if (key === 'title' || key === 'long_title') return value.replace(/\s+/g, ' ');
  if (NUMERIC_ATTRS.has(key) && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (BOOLEAN_ATTRS.has(key)) return !/^(false|no|0)$/i.test(value);
  return value;
}

function parseAttributes(source) {
  const attrs = {};
  let m;
  ATTR.lastIndex = 0;
  while ((m = ATTR.exec(source)) !== null) {
    const key = m[1].toLowerCase();
    const hasValue = m[2] !== undefined || m[3] !== undefined;
    let value = hasValue ? (m[2] !== undefined ? m[2] : m[3]) : 'true';
    // &lt; &gt; &quot; let a value hold characters that would end the tag (a literal "-->" closes the comment)
    value = value.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
    if (value === '') continue;
    attrs[key] = coerce(key, value);
  }
  return attrs;
}

function tokenize(text) {
  const tokens = [];
  let m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(text)) !== null) {
    tokens.push({
      // <!-- base:long_title --> reads as <!-- field:long_title -->
      kind: /^(?:base|part|division|overview)$/.test(m[2]) ? 'field' : m[2],
      closing: Boolean(m[1]),
      // scripture-list and scripture_list are the same name; so are "item: nirv" and "item:nirv"
      name: fieldName(m[3] || ''),
      source: m[4],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return tokens;
}

// A block of freeform handwriting: <!-- block:part-body --> … <!-- /block:part-body -->.
// Its text stays in the document body; only the tags themselves are removed.
const BODY_BLOCK = /^(?:(?:base|part|division|overview|course)[-_])?body$/i;

// Free text keeps growing: writing short_description or long_description again
// appends to it, in the order the pieces occur. A single-valued field (title,
// number, a url…) keeps one value: a hand-written <!-- field --> beats a meta
// attribute, otherwise the first one written wins, and a different second
// value is reported rather than silently dropped.
const APPENDING = new Set(['short_description', 'long_description']);

function resolveScalars(found, warnings) {
  const byKey = new Map();
  found.forEach(entry => {
    if (!byKey.has(entry.key)) byKey.set(entry.key, []);
    byKey.get(entry.key).push(entry);
  });
  const meta = {};
  byKey.forEach((entries, key) => {
    if (APPENDING.has(key)) {
      meta[key] = entries.map(e => e.value).join('\n\n');
      return;
    }
    const chosen = entries.find(e => e.field) || entries[0];
    meta[key] = chosen.value;
    if (entries.some(e => e.value !== chosen.value)) {
      warnings.push(`${key} is written more than once with different values (using ${JSON.stringify(String(chosen.value))})`);
    }
  });
  return meta;
}

// Text written directly in a resource block, outside any item, is the `text` of
// one item titled after the block (`<!-- block:base_sketch -->…` → "Base sketch").
function takeLooseText(text, block, closeTag, ranges, blocks) {
  const inner = ranges.slice(block.rangeStart, ranges.length - 1).sort((a, b) => a[0] - b[0]);
  let loose = '';
  let cursor = block.bodyStart;
  inner.forEach(([start, end]) => {
    if (start > cursor) loose += text.slice(cursor, start);
    cursor = Math.max(cursor, end);
  });
  if (closeTag.start > cursor) loose += text.slice(cursor, closeTag.start);
  loose = loose.replace(/\n{3,}/g, '\n\n').trim();
  if (!loose) return;
  const title = block.name.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  (blocks[block.name] = blocks[block.name] || []).unshift({ alias: 'text', attrs: { title }, body: loose, children: [] });
  ranges.push([block.bodyStart, closeTag.start]);
}

// Pass 1: tags → { types, meta, blocks, ranges }. `ranges` are removed for pass 2.
function extractTags(text, warnings, errors) {
  const tokens = tokenize(text);
  const types = [];
  const found = []; // every scalar value in order of occurrence: { key, value, field }
  const blocks = {};
  const ranges = [];
  let block = null;
  let openMeta = null;

  // Pair each <!-- /item:x --> with the nearest unclosed <!-- item:x -->. An item
  // that is never closed is a leaf; a closed one may hold further items (a
  // scripture holds its teacher_notes and versions) and its own text.
  const pairs = new Map();
  const unclosed = {};
  tokens.forEach((t, i) => {
    if (t.kind !== 'item') return;
    if (!t.closing) (unclosed[t.name] = unclosed[t.name] || []).push(i);
    else if ((unclosed[t.name] || []).length) pairs.set(unclosed[t.name].pop(), i);
  });
  const open = [];

  function finishItem(node, parent, endPos) {
    if (parent) {
      parent.children.push(node);
      parent.cursor = endPos;
      return;
    }
    const { alias, attrs, body, children } = node;
    if (!block) {
      warnings.push(`item:${alias} is outside any block (ignored)`);
    } else if (block.isBody) {
      warnings.push(`item:${alias} inside block:${block.name} (ignored; ${block.name} only holds freeform text)`);
    } else if (block.known) {
      (blocks[block.name] = blocks[block.name] || []).push({ alias, attrs, body, children });
    }
  }
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];

    // A tag that forgot its closing "-->" runs on until the next "-->" and swallows what is in between.
    const swallowed = /<!--|<\//.exec(t.source);
    if (swallowed) {
      warnings.push(`<!-- ${t.closing ? '/' : ''}${t.kind}${t.name ? ':' + t.name : ''} …> is missing its closing "-->" (it ran on into "${t.source.slice(swallowed.index).trim().slice(0, 40)}")`);
    }

    if (t.kind === 'meta') {
      ranges.push([t.start, t.end]);
      if (t.closing) {
        if (!openMeta) warnings.push(`stray <!-- /meta${t.name ? ':' + t.name : ''} --> without an opening meta tag`);
        else if (t.name && resolveType(t.name) !== openMeta) warnings.push(`meta:${openMeta} was closed by /meta:${t.name}`);
        openMeta = null;
        continue;
      }

      let type = null;
      if (t.name) {
        type = resolveType(t.name);
        if (!type) {
          errors.push(`unknown meta type "${t.name}" — use ${Object.keys(DOC_TYPES).map(k => 'meta:' + k).join(', ')}`);
          continue;
        }
        if (!types.includes(type)) types.push(type);
      }

      const attrs = parseAttributes(t.source);
      const next = tokens[i + 1];
      if (!t.name && next && next.kind === 'meta' && next.closing && !next.name) {
        // legacy: <!-- meta ... -->long description<!-- /meta -->
        const body = text.slice(t.end, next.start).trim();
        if (body && attrs.long_description === undefined) attrs.long_description = body;
        ranges.push([t.end, next.end]);
        i += 1;
      } else if (t.name) {
        openMeta = type;
      }
      Object.entries(attrs).forEach(([key, value]) => {
        const field = fieldName(key);
        found.push({ key: field, value, field: false });
      });
      continue;
    }

    if (t.kind === 'field') {
      ranges.push([t.start, t.end]);
      if (t.closing) {
        warnings.push(`stray <!-- /field:${t.name} -->`);
        continue;
      }
      const next = tokens[i + 1];
      if (!t.name || !next || next.kind !== 'field' || !next.closing || next.name !== t.name) {
        warnings.push(`<!-- field${t.name ? ':' + t.name : ''} --> needs a matching <!-- /field${t.name ? ':' + t.name : ''} -->`);
        continue;
      }
      const value = text.slice(t.end, next.start).trim();
      ranges.push([t.end, next.end]);
      i += 1;
      const field = fieldName(t.name);
      if (value !== '') found.push({ key: field, value: coerce(field, value), field: true });
      continue;
    }

    if (t.kind === 'block') {
      ranges.push([t.start, t.end]);
      if (t.closing) {
        if (!block) warnings.push(`stray <!-- /block:${t.name} -->`);
        else if (block.name !== t.name) warnings.push(`block:${block.name} was closed by /block:${t.name}`);
        else if (RESOURCE_BLOCKS.includes(block.name)) takeLooseText(text, block, t, ranges, blocks);
        block = null;
        open.length = 0;
        continue;
      }
      if (block) warnings.push(`block:${block.name} was not closed before block:${t.name}`);
      open.length = 0;
      const isBody = BODY_BLOCK.test(t.name);
      const known = isBody || BLOCK_FIELDS.includes(t.name);
      if (!known) warnings.push(`unknown block "${t.name}" (its items are ignored)`);
      block = { name: t.name, known, isBody, bodyStart: t.end, rangeStart: ranges.length };
      continue;
    }

    // item
    ranges.push([t.start, t.end]);
    if (t.closing) {
      const node = open.pop();
      if (!node || node.name !== t.name || node.closeAt !== i) {
        warnings.push(`stray <!-- /item:${t.name} -->`);
        if (node) open.push(node);
        continue;
      }
      node.pieces.push(text.slice(node.cursor, t.start));
      node.body = node.pieces.join('').replace(/\n{3,}/g, '\n\n').trim();
      ranges.push([node.bodyStart, t.end]);
      finishItem(node, open[open.length - 1], t.end);
      continue;
    }
    const node = { alias: t.name, name: t.name, attrs: parseAttributes(t.source), body: '', children: [], pieces: [], start: t.start, bodyStart: t.end, cursor: t.end, closeAt: pairs.get(i) };
    const parent = open[open.length - 1];
    if (parent) parent.pieces.push(text.slice(parent.cursor, t.start));
    if (node.closeAt !== undefined) {
      open.push(node);
    } else {
      finishItem(node, parent, t.end);
    }
  }

  // A final "<!--" with no "-->" after it hides everything below it.
  const lastOpen = text.lastIndexOf('<!--');
  if (lastOpen !== -1 && lastOpen > text.lastIndexOf('-->')) {
    warnings.push(`a comment starting "${text.slice(lastOpen, lastOpen + 40).replace(/\s+/g, ' ').trim()}" is never closed with "-->", so everything after it is hidden`);
  }
  if (block) warnings.push(`block:${block.name} was never closed`);
  open.forEach(node => warnings.push(`item:${node.alias} was never closed properly (check the order of its closing tags)`));
  if (openMeta) warnings.push(`meta:${openMeta} was never closed`);
  const meta = resolveScalars(found, warnings);
  return { types, meta, blocks, ranges };
}

// Pass 2: whatever is not a tag.
function extractBody(text, ranges) {
  const sorted = ranges.slice().sort((a, b) => a[0] - b[0]);
  let out = '';
  let cursor = 0;
  sorted.forEach(([start, end]) => {
    if (start > cursor) out += text.slice(cursor, start);
    cursor = Math.max(cursor, end);
  });
  out += text.slice(cursor);
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

// ── items → raw objects ──────────────────────────────────────────────────────

const isStep = alias => /step/i.test(alias);
const isSublink = alias => /sub/i.test(alias);

function pick(attrs, keys) {
  const out = {};
  keys.forEach(k => {
    if (attrs[k] !== undefined) out[k] = attrs[k];
  });
  return out;
}

function withText(raw, field, item) {
  const text = item.body || item.attrs[field];
  if (text !== undefined && text !== '') raw[field] = text;
  return raw;
}

// Items sharing an explicit `order` are one logical item written in pieces:
// bodies are joined, list attributes are appended, other attributes keep the
// first value seen.
function upsertByOrder(items) {
  const merged = [];
  const byKey = new Map();
  items.forEach(item => {
    if (item.attrs.order === undefined) {
      merged.push(item);
      return;
    }
    const kind = isStep(item.alias) ? 'step' : isSublink(item.alias) ? 'sub' : 'main';
    const parent = item.attrs.order_parent === undefined ? '' : item.attrs.order_parent;
    const key = `${kind}|${item.attrs.order}|${parent}`;
    const existing = byKey.get(key);
    if (!existing) {
      const copy = { alias: item.alias, attrs: { ...item.attrs }, body: item.body, children: [...(item.children || [])] };
      byKey.set(key, copy);
      merged.push(copy);
      return;
    }
    Object.entries(item.attrs).forEach(([k, v]) => {
      if (existing.attrs[k] === undefined) existing.attrs[k] = v;
      else if (LIST_ATTRS.has(k) && typeof v === 'string') existing.attrs[k] = `${existing.attrs[k]},${v}`;
    });
    if (item.body) existing.body = existing.body ? `${existing.body}\n\n${item.body}` : item.body;
    existing.children.push(...(item.children || []));
  });
  return merged;
}

function simpleMedia(keys) {
  return item => {
    const raw = pick(item.attrs, keys);
    if (raw.alt === undefined && item.body) raw.alt = item.body;
    return raw;
  };
}

const RESOURCE_BLOCKS = [
  'block_talk_content',
  'homeschooling_supporting_content',
  'board_game_content',
  'childrens_content',
  'base_sketch',
  'part_sketch',
  'division_sketch',
  'overview_sketch',
];

const MAPPERS = {
  images: simpleMedia(['src', 'alt', 'main_image']),
  videos: simpleMedia(['src', 'alt', 'main_video']),
  youtube: simpleMedia(['src', 'alt']),
  podcast: simpleMedia(['src', 'alt']),
  concept_lexicon: item => withText(pick(item.attrs, ['term', 'image', 'references']), 'definition', item),
  mind_movies: item => withText(pick(item.attrs, ['order', 'track_urls', 'notes']), 'text', item),
  mishnah_catechesis: item =>
    withText(pick(item.attrs, ['order', 'hand_gisture', 'question', 'notes']), 'answer', item),
};
RESOURCE_BLOCKS.forEach(name => {
  MAPPERS[name] = item =>
    withText(pick(item.attrs, ['title', 'order', 'url', 'image_urls', 'video_urls', 'audio_urls', 'notes']), 'text', item);
});

const ORDERED_BLOCKS = new Set(['mind_movies', 'mishnah_catechesis', ...RESOURCE_BLOCKS]);

// A pedagogical question, Socratic in spirit: the question is the item's own
// body text (an explicit question="…" attribute still works and wins over
// it); a nested `item:answer` supplies the answer — write none for "no
// answer yet", or several to join them as paragraphs (an answer may itself
// be a further question).
function buildQuestions(items, warnings) {
  return items.map(item => {
    const raw = pick(item.attrs, ['order']);
    const hasQuestionAttr = item.attrs.question !== undefined;
    raw.question = hasQuestionAttr ? item.attrs.question : item.body;
    const answers = item.attrs.answer !== undefined ? [item.attrs.answer] : [];
    (item.children || []).forEach(child => {
      if (/^answers?$/i.test(child.alias)) {
        const text = child.body || child.attrs.answer || child.attrs.text;
        if (text) answers.push(text);
      } else {
        warnings.push(`item:${child.alias} inside a question is not used (use item:answer)`);
      }
    });
    // question="…" is the old convention, where the item's own body (not a
    // nested item:answer) was the answer; keep that working.
    if (hasQuestionAttr && !answers.length && item.body) answers.push(item.body);
    if (answers.length) raw.answer = answers.join('\n\n');
    return raw;
  });
}

// ── scriptures ───────────────────────────────────────────────────────────────
// A scripture's body is its direct translation (`text`). Inside it may sit
// `item:teacher_notes` (repeatable) and `item:versions` holding `item:nirv`,
// `item:leb` and `item:original`. Because they are nested they belong to that
// scripture, whatever its `order`. A teacher_notes / versions item written on
// its own (outside any scripture) says which scripture it belongs to with
// `ref`, so versions can be handwritten out of order in the sketchbook.

const VERSION_KEYS = { nirv: 'nirv', leb: 'leb', original: 'original', original_language: 'original' };
const ADDENDUM = { versions: 'versions', version: 'versions', teacher_notes: 'teacher_notes', teacher_note: 'teacher_notes' };

const normRef = ref => String(ref).replace(/\s+/g, ' ').trim().toLowerCase();

function addVersion(raw, key, value, ref, warnings) {
  if (value === undefined || value === '') return;
  raw.versions = raw.versions || {};
  if (raw.versions[key] === undefined) raw.versions[key] = value;
  else if (raw.versions[key] !== value) warnings.push(`scripture ${ref}: ${key} is written more than once with different values (using the first)`);
}

function addVersions(raw, item, ref, warnings) {
  Object.entries(item.attrs).forEach(([k, v]) => {
    if (VERSION_KEYS[k]) addVersion(raw, VERSION_KEYS[k], String(v), ref, warnings);
  });
  (item.children || []).forEach(child => {
    const key = VERSION_KEYS[child.alias];
    if (key) addVersion(raw, key, child.body || child.attrs.text, ref, warnings);
    else warnings.push(`scripture ${ref}: item:${child.alias} inside versions is not used (use ${Object.keys(VERSION_KEYS).filter(k => k !== 'original_language').join(', ')})`);
  });
}

function addPart(raw, item, ref, warnings) {
  const kind = ADDENDUM[item.alias];
  if (kind === 'teacher_notes') {
    const note = item.body || item.attrs.text;
    if (note) (raw.teacher_notes = raw.teacher_notes || []).push(note);
  } else {
    addVersions(raw, item, ref, warnings);
  }
}

function buildScripture(item, warnings) {
  const raw = withText(pick(item.attrs, ['ref', 'essential', 'order']), 'text', item);
  const ref = item.attrs.ref || '(no ref)';
  if (item.attrs.teacher_notes) raw.teacher_notes = [item.attrs.teacher_notes];
  (item.children || []).forEach(child => {
    if (ADDENDUM[child.alias]) addPart(raw, child, ref, warnings);
    else if (VERSION_KEYS[child.alias]) addVersions(raw, { attrs: {}, children: [child] }, ref, warnings);
    else warnings.push(`scripture ${ref}: item:${child.alias} is not used inside a scripture (ignored)`);
  });
  return raw;
}

function buildScriptures(items, warnings) {
  const scriptures = items.filter(item => !ADDENDUM[item.alias]);
  const addenda = items.filter(item => ADDENDUM[item.alias]);
  const raws = upsertByOrder(scriptures).map(item => buildScripture(item, warnings));

  const byRef = new Map();
  raws.forEach(raw => {
    if (raw.ref === undefined) return;
    const key = normRef(raw.ref);
    if (byRef.has(key)) warnings.push(`scripture ${raw.ref} is in the list more than once; separate versions go to the first`);
    else byRef.set(key, raw);
  });

  addenda.forEach(item => {
    const ref = item.attrs.ref;
    if (ref === undefined) {
      warnings.push(`item:${item.alias} outside a scripture needs ref="…" to say which scripture it belongs to (ignored)`);
      return;
    }
    const target = byRef.get(normRef(ref));
    if (!target) warnings.push(`item:${item.alias} ref="${ref}" matches no scripture in the list (ignored)`);
    else addPart(target, item, target.ref, warnings);
  });
  return raws;
}

// A practice or hand gisture is followed by its `item:step` siblings.
function buildWithSteps(items, stepTextField) {
  const out = [];
  let current = null;
  items.forEach(item => {
    if (isStep(item.alias)) {
      if (!current) return;
      const step = pick(item.attrs, ['number', 'image']);
      withText(step, stepTextField, item);
      if (item.attrs.images) {
        step.images = String(item.attrs.images)
          .split(',')
          .map(s => ({ src: s.trim() }))
          .filter(i => i.src);
      }
      current.steps.push(step);
      return;
    }
    current = { ...pick(item.attrs, ['name']), steps: [] };
    withText(current, 'description', item);
    out.push(current);
  });
  return out;
}

function sortByOrder(list) {
  return list
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ao = a.item.order === undefined ? Infinity : a.item.order;
      const bo = b.item.order === undefined ? Infinity : b.item.order;
      return ao === bo ? a.index - b.index : ao - bo;
    })
    .map(x => x.item);
}

// Sublinks attach to the link whose `order` equals their `order_parent`, or to
// the link written before them when no order_parent is given.
function buildOutline(items) {
  const links = [];
  const pending = [];
  items.forEach(item => {
    if (isSublink(item.alias)) {
      const sub = withText(pick(item.attrs, ['order', 'order_parent', 'notes', 'base_prop_refs']), 'text', item);
      if (sub.base_prop_refs === undefined && item.attrs.base_property_references !== undefined) sub.base_prop_refs = item.attrs.base_property_references;
      pending.push({ sub, previous: links[links.length - 1] });
      return;
    }
    const link = withText(pick(item.attrs, ['order', 'notes']), 'text', item);
    link.sublinks = [];
    links.push(link);
  });
  pending.forEach(({ sub, previous }) => {
    const parent = sub.order_parent !== undefined ? links.find(l => l.order === sub.order_parent) : previous;
    if (parent) parent.sublinks.push(sub);
    else links.push({ order: sub.order_parent, text: '', sublinks: [sub] });
  });
  // Missing orders fall back to the natural writing sequence.
  links.forEach((link, i) => {
    if (link.order === undefined) link.order = i + 1;
    link.sublinks = sortByOrder(link.sublinks);
    link.sublinks.forEach((sub, j) => {
      if (sub.order === undefined) sub.order = j + 1;
    });
  });
  return links;
}

// GitHub renders a line indented four or more spaces (or a tab) as a code block,
// so an indented tag is no longer hidden: its raw text shows up in the issue.
// The site still reads it, so this only warns.
function indentedTagWarnings(source) {
  const lines = [];
  source.split('\n').forEach((line, i) => {
    if (/^(?: {4,}|\t)\s*<!--/.test(line)) lines.push(i + 1);
  });
  if (!lines.length) return [];
  const shown = lines.slice(0, 5).join(', ') + (lines.length > 5 ? ', …' : '');
  return [`${lines.length} tag line(s) are indented 4+ spaces (lines ${shown}); GitHub shows those as code blocks, so the tags become visible in the issue. Remove the leading spaces (up to 3 are fine)`];
}

/**
 * @param {string} text issue body
 * @param {{defaultType?: string}} [options] type to assume when the body has no meta:TYPE
 * @returns {{written: string|null, type: string, raw: object, warnings: string[], errors: string[]}}
 *   `written` is the meta:TYPE found in the body (null for a bare meta tag or
 *   none); `type` is what the issue is treated as. `raw` is ready for that
 *   type's Zod schema, with freeform text under its body field (base_body, part_body…).
 */
function parseDocText(text, options = {}) {
  const source = String(text || '').replace(/\r\n/g, '\n');
  const warnings = [];
  const errors = [];
  const { types, meta, blocks, ranges } = extractTags(source, warnings, errors);

  if (types.length > 1) errors.push(`one issue cannot mix ${types.map(t => 'meta:' + t).join(' and ')}`);
  const written = types[0] || null;
  const type = written || options.defaultType || null;

  const allowed = new Set(DOC_TYPES[type || 'base'].meta);
  const raw = {};
  Object.entries(meta).forEach(([key, value]) => {
    if (allowed.has(key)) raw[key] = value;
    else warnings.push(`meta: attribute "${key}" is not used by ${type || 'base'} (ignored)`);
  });

  Object.entries(blocks).forEach(([name, items]) => {
    if (!DOC_TYPES[type || 'base'].blocks.includes(name)) {
      warnings.push(`block:${name} is not used by ${type || 'base'} (ignored)`);
      return;
    }
    if (name === 'scripture_list') {
      raw[name] = sortByOrder(buildScriptures(items, warnings));
      return;
    }
    if (name === 'questions') {
      raw[name] = sortByOrder(buildQuestions(items, warnings));
      return;
    }
    const merged = upsertByOrder(items);
    if (name === 'practices') raw[name] = buildWithSteps(merged, 'instructions');
    else if (name === 'hand_gistures') raw[name] = buildWithSteps(merged, 'text');
    else if (name === 'outline_chain') raw[name] = sortByOrder(buildOutline(merged));
    else {
      const list = merged.map(MAPPERS[name]);
      raw[name] = ORDERED_BLOCKS.has(name) ? sortByOrder(list) : list;
    }
  });

  raw[DOC_TYPES[type || 'base'].body] = extractBody(source, ranges);
  warnings.push(...indentedTagWarnings(source));
  return { written, type: type || 'base', raw, warnings, errors };
}

module.exports = { parseDocText, parseAttributes, tokenize };
