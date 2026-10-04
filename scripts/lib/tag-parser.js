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
// Pass 1 extracts the tags into a plain object (before Zod validation).
// Pass 2 treats everything that is not a tag as the freeform base_body.
// Inside a known block any `item:*` alias is accepted (item:game, item:activity…).

const { BLOCK_FIELDS, DOC_TYPES, resolveType } = require('./schema');

const TAG = /<!--\s*(\/)?\s*(meta|block|item)\b(?::([A-Za-z0-9_-]+))?([\s\S]*?)-->/g;
const ATTR = /([A-Za-z_][\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;

const NUMERIC_ATTRS = new Set(['order', 'order_parent', 'number', 'part_parent']);
const BOOLEAN_ATTRS = new Set(['essential', 'main_image', 'main_video']);
const LIST_ATTRS = new Set(['image_urls', 'video_urls', 'audio_urls', 'track_urls', 'references', 'images']);

function parseAttributes(source) {
  const attrs = {};
  let m;
  ATTR.lastIndex = 0;
  while ((m = ATTR.exec(source)) !== null) {
    const key = m[1].toLowerCase();
    const hasValue = m[2] !== undefined || m[3] !== undefined;
    let value = hasValue ? (m[2] !== undefined ? m[2] : m[3]) : 'true';
    value = value.trim();
    if (value === '') continue;
    if (NUMERIC_ATTRS.has(key) && /^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    else if (BOOLEAN_ATTRS.has(key)) value = !/^(false|no|0)$/i.test(value);
    attrs[key] = value;
  }
  return attrs;
}

function tokenize(text) {
  const tokens = [];
  let m;
  TAG.lastIndex = 0;
  while ((m = TAG.exec(text)) !== null) {
    tokens.push({
      kind: m[2],
      closing: Boolean(m[1]),
      name: m[3] || '',
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

// Pass 1: tags → { types, meta, blocks, ranges }. `ranges` are removed for pass 2.
function extractTags(text, warnings, errors) {
  const tokens = tokenize(text);
  const types = [];
  const meta = {};
  const blocks = {};
  const ranges = [];
  let block = null;
  let openMeta = null;

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];

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
        if (meta[key] === undefined) meta[key] = value;
      });
      continue;
    }

    if (t.kind === 'block') {
      ranges.push([t.start, t.end]);
      if (t.closing) {
        if (!block) warnings.push(`stray <!-- /block:${t.name} -->`);
        else if (block.name !== t.name) warnings.push(`block:${block.name} was closed by /block:${t.name}`);
        block = null;
        continue;
      }
      if (block) warnings.push(`block:${block.name} was not closed before block:${t.name}`);
      const isBody = BODY_BLOCK.test(t.name);
      const known = isBody || BLOCK_FIELDS.includes(t.name);
      if (!known) warnings.push(`unknown block "${t.name}" (its items are ignored)`);
      block = { name: t.name, known, isBody };
      continue;
    }

    // item
    ranges.push([t.start, t.end]);
    if (t.closing) {
      warnings.push(`stray <!-- /item:${t.name} -->`);
      continue;
    }
    let body = '';
    const next = tokens[i + 1];
    if (next && next.kind === 'item' && next.closing && next.name === t.name) {
      body = text.slice(t.end, next.start).trim();
      ranges.push([t.end, next.end]);
      i += 1;
    }
    if (!block) {
      warnings.push(`item:${t.name} is outside any block (ignored)`);
      continue;
    }
    if (block.isBody) {
      warnings.push(`item:${t.name} inside block:${block.name} (ignored; ${block.name} only holds freeform text)`);
      continue;
    }
    if (!block.known) continue;
    (blocks[block.name] = blocks[block.name] || []).push({ alias: t.name, attrs: parseAttributes(t.source), body });
  }

  if (block) warnings.push(`block:${block.name} was never closed`);
  if (openMeta) warnings.push(`meta:${openMeta} was never closed`);
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
      const copy = { alias: item.alias, attrs: { ...item.attrs }, body: item.body };
      byKey.set(key, copy);
      merged.push(copy);
      return;
    }
    Object.entries(item.attrs).forEach(([k, v]) => {
      if (existing.attrs[k] === undefined) existing.attrs[k] = v;
      else if (LIST_ATTRS.has(k) && typeof v === 'string') existing.attrs[k] = `${existing.attrs[k]},${v}`;
    });
    if (item.body) existing.body = existing.body ? `${existing.body}\n\n${item.body}` : item.body;
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
  scripture_list: item => withText(pick(item.attrs, ['ref', 'essential', 'order', 'teacher_notes']), 'text', item),
  concept_lexicon: item => withText(pick(item.attrs, ['term', 'image', 'references']), 'definition', item),
  mind_movies: item => withText(pick(item.attrs, ['order', 'track_urls', 'notes']), 'text', item),
  mishnah_catechesis: item =>
    withText(pick(item.attrs, ['order', 'hand_gisture', 'question', 'notes']), 'answer', item),
};
RESOURCE_BLOCKS.forEach(name => {
  MAPPERS[name] = item =>
    withText(pick(item.attrs, ['title', 'order', 'url', 'image_urls', 'video_urls', 'audio_urls', 'notes']), 'text', item);
});

const ORDERED_BLOCKS = new Set(['scripture_list', 'mind_movies', 'mishnah_catechesis', ...RESOURCE_BLOCKS]);

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
      const sub = withText(pick(item.attrs, ['order', 'order_parent', 'notes']), 'text', item);
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
  return { written, type: type || 'base', raw, warnings, errors };
}

module.exports = { parseDocText, parseAttributes, tokenize };
