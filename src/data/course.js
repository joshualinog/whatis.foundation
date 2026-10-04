// The course structure (src/content/course-defaults.js) with whatever has been
// written in the part, division and overview issues laid over it
// (src/content/parts|divisions/*.json and overview.json, synced from issues).

const fs = require('fs');
const path = require('path');
const defaults = require('../content/course-defaults');
const { PartSchema, DivisionSchema, OverviewSchema } = require('../../scripts/lib/schema');

const CONTENT = path.join(__dirname, '..', 'content');

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

function loadNumbered(dir) {
  const full = path.join(CONTENT, dir);
  const out = new Map();
  if (!fs.existsSync(full)) return out;
  fs.readdirSync(full)
    .filter(f => f.endsWith('.json'))
    .forEach(f => {
      const data = readJson(path.join(full, f));
      if (data && Number.isInteger(data.number)) out.set(data.number, data);
    });
  return out;
}

// The page content for one part/division/overview: schema defaults + synced text.
function documentFor(schema, base, synced) {
  const doc = { ...schema.parse(base), ...(synced || {}) };
  doc.main_video = doc.videos.find(v => v.main_video && v.src) || doc.videos.find(v => v.src) || null;
  return doc;
}

module.exports = function () {
  const syncedParts = loadNumbered('parts');
  const syncedDivisions = loadNumbered('divisions');
  const syncedOverview = readJson(path.join(CONTENT, 'overview.json'));

  const parts = defaults.parts.map(part => {
    const synced = syncedParts.get(part.number);
    const doc = documentFor(PartSchema, { title: part.title, number: part.number }, synced);
    return {
      ...part,
      title: (synced && synced.title) || part.title,
      overview: (synced && synced.short_description) || part.overview,
      url: `/parts/${part.number}/`,
      doc,
      has_content: hasContent(doc, 'part_body'),
    };
  });

  const divisions = defaults.divisions.map(division => {
    const synced = syncedDivisions.get(division.number);
    const doc = documentFor(DivisionSchema, { title: division.title, number: division.number }, synced);
    return {
      ...division,
      title: (synced && synced.title) || division.title,
      summary: (synced && synced.short_description) || division.summary,
      url: `/divisions/${division.number}/`,
      doc,
      has_content: hasContent(doc, 'division_body'),
    };
  });

  const overviewDoc = documentFor(OverviewSchema, { title: defaults.heading }, syncedOverview);

  return {
    ...defaults,
    heading: overviewDoc.title,
    description: overviewDoc.short_description || defaults.description,
    parts,
    divisions,
    overview: { url: '/overview/', doc: overviewDoc, has_content: hasContent(overviewDoc, 'overview_body') },
  };
};

function hasContent(doc, bodyKey) {
  return Boolean(
    doc.long_description || doc[bodyKey] || doc.images.length || doc.videos.length || doc.scripture_list.length ||
      doc.youtube.length || doc.podcast.length
  );
}
