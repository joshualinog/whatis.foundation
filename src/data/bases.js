// All 102 bases (0–101): canonical titles from issue #184, enriched with the
// content synced from base issues into src/content/bases/*.json.

const fs = require('fs');
const path = require('path');
const course = require('./course')();
const titles = require('./base-titles.json');
const { splitTitle } = require('../../scripts/lib/base-titles');
const { BaseSchema, expectedPart } = require('../../scripts/lib/schema');

const CONTENT_DIR = path.join(__dirname, '..', 'content', 'bases');

function loadSynced() {
  const synced = new Map();
  if (!fs.existsSync(CONTENT_DIR)) return synced;
  fs.readdirSync(CONTENT_DIR)
    .filter(f => f.endsWith('.json'))
    .forEach(f => {
      const data = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8'));
      if (Number.isInteger(data.number)) synced.set(data.number, data);
    });
  return synced;
}

function kindOf(number) {
  if (number === 0) return 'intro';
  if (number === 30) return 'nexus';
  if (number === 101) return 'ceremony';
  return 'part';
}

module.exports = function () {
  const synced = loadSynced();

  return titles.map(({ number, title: canonicalTitle }) => {
    const content = synced.get(number) || {};
    const defaults = BaseSchema.parse({ title: canonicalTitle, number, part_parent: expectedPart(number) });
    const base = { ...defaults, ...content };

    base.long_title = content.long_title || canonicalTitle;
    base.part_parent = content.part_parent || expectedPart(number);
    base.issue = content.issue || null;

    const { headline, subtitle, space } = splitTitle(base.long_title);
    base.title = content.title || headline;
    base.headline = headline;
    base.subtitle = subtitle;
    base.kind = kindOf(number);
    base.url = `/bases/${number}/`;

    base.part = course.parts.find(p => p.number === base.part_parent) || null;
    base.division = base.part ? course.divisions.find(d => d.number === base.part.division) : null;
    base.special = course.specials[number] || null;
    base.space = space && course.spaces[space] ? { number: space, ...course.spaces[space] } : null;
    base.accent = base.special || base.space || base.part;

    base.main_image = base.images.find(i => i.main_image && i.src) || base.images.find(i => i.src) || null;
    base.main_video = base.videos.find(v => v.main_video && v.src) || base.videos.find(v => v.src) || null;
    base.has_content = Boolean(
      base.short_description || base.long_description || base.base_body || base.images.length || base.videos.length ||
        base.scripture_list.length || base.outline_chain.length || base.concept_lexicon.length || base.practices.length
    );

    return base;
  });
};
