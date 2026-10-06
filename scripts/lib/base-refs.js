'use strict';

// An outline sublink can point at other things in the same base with
// base_prop_refs="type" or "type:selector", comma separated, for example
//   base_prop_refs="mind_movie:1, scripture:John 1:5, concept_entry:Light, hand_gisture:Menorah, image:2"
// `type` is a base field (scripture_list, concept_lexicon…) or its singular
// (scripture, concept_entry…). `selector` is a 1-based position or the text of the
// item's key field (a reference, term, name or title). Without a selector the
// whole field is meant. Splitting is on the first colon only, so a scripture
// reference such as "John 1:5" keeps its own colon.

const TYPES = {
  images: { field: 'images', keys: ['alt', 'src'] },
  videos: { field: 'videos', keys: ['alt', 'src'] },
  scripture_list: { field: 'scripture_list', keys: ['ref'] },
  concept_lexicon: { field: 'concept_lexicon', keys: ['term'] },
  practices: { field: 'practices', keys: ['name'] },
  mind_movies: { field: 'mind_movies', keys: [] },
  mishnah_catechesis: { field: 'mishnah_catechesis', keys: ['question', 'hand_gisture'] },
  hand_gistures: { field: 'hand_gistures', keys: ['name'] },
  youtube: { field: 'youtube', keys: ['alt', 'src'] },
  podcast: { field: 'podcast', keys: ['alt', 'src'] },
  block_talk_content: { field: 'block_talk_content', keys: ['title'] },
  homeschooling_supporting_content: { field: 'homeschooling_supporting_content', keys: ['title'] },
  board_game_content: { field: 'board_game_content', keys: ['title'] },
  childrens_content: { field: 'childrens_content', keys: ['title'] },
  base_sketch: { field: 'base_sketch', keys: ['title'] },
};

const SINGULAR = {
  image: 'images',
  video: 'videos',
  scripture: 'scripture_list',
  concept_entry: 'concept_lexicon',
  concept: 'concept_lexicon',
  practice: 'practices',
  mind_movie: 'mind_movies',
  mishnah: 'mishnah_catechesis',
  catechesis: 'mishnah_catechesis',
  hand_gisture: 'hand_gistures',
};

const norm = s => String(s).trim().toLowerCase();

/** @returns {{type: string, selector: string}|null} */
function splitRef(ref) {
  const text = String(ref).trim();
  const at = text.indexOf(':');
  const name = norm(at === -1 ? text : text.slice(0, at)).replace(/[\s-]+/g, '_');
  const key = SINGULAR[name] || (TYPES[name] ? name : null);
  if (!key) return null;
  return { type: key, selector: at === -1 ? '' : text.slice(at + 1).trim() };
}

/** Whether `ref` points at something that exists in `doc`; `problem` says why not. */
function checkRef(doc, ref) {
  const parsed = splitRef(ref);
  if (!parsed) return { ok: false, problem: `"${ref}": unknown type (use one of ${Object.keys(TYPES).join(', ')} or a singular such as scripture, image)` };
  const items = doc[TYPES[parsed.type].field] || [];
  if (parsed.selector === '') return items.length ? { ok: true } : { ok: false, problem: `"${ref}": ${parsed.type} is empty in this base` };
  if (/^\d+$/.test(parsed.selector)) {
    const n = Number(parsed.selector);
    return n >= 1 && n <= items.length ? { ok: true } : { ok: false, problem: `"${ref}": ${parsed.type} has ${items.length} item(s)` };
  }
  const wanted = norm(parsed.selector);
  const hit = items.some(item => TYPES[parsed.type].keys.some(k => item[k] !== undefined && norm(item[k]) === wanted));
  return hit ? { ok: true } : { ok: false, problem: `"${ref}": no ${parsed.type} item matches "${parsed.selector}"` };
}

/** Warnings for every unresolved base_prop_refs in a base's outline. */
function refWarnings(doc) {
  const out = [];
  (doc.outline_chain || []).forEach(link =>
    (link.sublinks || []).forEach(sub =>
      (sub.base_prop_refs || []).forEach(ref => {
        const { ok, problem } = checkRef(doc, ref);
        if (!ok) out.push(`outline ${link.order}.${sub.order} base_prop_refs ${problem}`);
      })
    )
  );
  return out;
}

module.exports = { checkRef, refWarnings, splitRef };
