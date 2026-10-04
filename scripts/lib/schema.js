'use strict';

// Zod schema for a Foundation "base", ported from the final schema.ts in
// "Foundation Course YAML Front Matter Schema.PDF" (issue #187). Field names,
// defaults and ranges follow that file. The one deliberate deviation:
// part_parent is optional for bases 0, 30 and 101, which sit outside the five
// parts (the PDF's schema has no place for them).

const { z } = require('zod');

const BASE_MIN = 0;
const BASE_MAX = 101;
const PARTLESS_BASES = [0, 30, 101];

const PART_RANGES = [
  { part: 1, from: 1, to: 7 },
  { part: 2, from: 8, to: 12 },
  { part: 3, from: 13, to: 22 },
  { part: 4, from: 23, to: 29 },
  { part: 5, from: 31, to: 100 },
];

function expectedPart(number) {
  const range = PART_RANGES.find(r => number >= r.from && number <= r.to);
  return range ? range.part : undefined;
}

// ── helpers & preprocessors ──────────────────────────────────────────────────

const commaSeparated = schema =>
  z
    .preprocess(val => {
      if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
      return val;
    }, z.array(schema))
    .default([]);

const commaSeparatedStrings = commaSeparated(z.string());
const commaSeparatedUrls = commaSeparated(z.string().url());

// ── shared sub-schemas ───────────────────────────────────────────────────────

const ImageSchema = z.object({
  src: z.string().url(),
  alt: z.string().default(''),
  main_image: z.boolean().default(false),
});

const VideoSchema = z.object({
  src: z.string().url(),
  alt: z.string().default(''),
  main_video: z.boolean().default(false),
});

const StepSchema = z.object({
  number: z.number().optional(),
  instructions: z.string().default(''),
  text: z.string().optional(),
  image: z.string().url().optional(),
  images: z.array(ImageSchema).default([]),
});

const ResourceContentSchema = z.object({
  title: z.string(),
  order: z.number().optional(),
  url: z.string().url().optional(),
  image_urls: commaSeparatedUrls,
  video_urls: commaSeparatedUrls,
  audio_urls: commaSeparatedUrls,
  notes: z.string().optional(),
  text: z.string().default(''),
});

// ── base domain objects ──────────────────────────────────────────────────────

const ScriptureSchema = z.object({
  ref: z.string(),
  essential: z.boolean().default(false),
  order: z.number().default(1),
  teacher_notes: z.string().optional(),
  text: z.string().default(''),
});

const OutlineSublinkSchema = z.object({
  order: z.number(),
  order_parent: z.number().optional(),
  notes: z.string().optional(),
  text: z.string(),
});

const OutlineLinkSchema = z.object({
  order: z.number(),
  notes: z.string().optional(),
  text: z.string(),
  sublinks: z.array(OutlineSublinkSchema).default([]),
});

const ConceptEntrySchema = z.object({
  term: z.string(),
  definition: z.string().default(''),
  image: z.string().url().optional(),
  references: commaSeparatedStrings,
});

const PracticeSchema = z.object({
  name: z.string(),
  description: z.string().default(''),
  steps: z.array(StepSchema).default([]),
});

const MindMovieSchema = z.object({
  order: z.number().default(1),
  track_urls: commaSeparatedUrls,
  text: z.string().default(''),
  notes: z.string().optional(),
});

const MishnahCatechesisSchema = z.object({
  order: z.number().default(1),
  hand_gisture: z.string(),
  question: z.string(),
  answer: z.string(),
  notes: z.string().optional(),
});

const HandGistureSchema = z.object({
  name: z.string(),
  description: z.string().default(''),
  steps: z.array(StepSchema).default([]),
});

const SimpleMediaSchema = z.object({
  src: z.string().url(),
  alt: z.string().default(''),
});

// ── array fields ─────────────────────────────────────────────────────────────
// Every array field is a <!-- block:NAME --> in an issue body.

const resources = () => z.array(ResourceContentSchema).default([]);

// What parts, divisions and the course overview carry besides their header
// (the PDF: "Composition over Redefinition"). `<type>_sketch` is their
// equivalent of base_sketch.
const containerArrays = type => ({
  images: z.array(ImageSchema).default([]),
  videos: z.array(VideoSchema).default([]),
  scripture_list: z.array(ScriptureSchema).default([]),
  youtube: z.array(SimpleMediaSchema).default([]),
  podcast: z.array(SimpleMediaSchema).default([]),
  block_talk_content: resources(),
  homeschooling_supporting_content: resources(),
  board_game_content: resources(),
  childrens_content: resources(),
  [`${type}_sketch`]: resources(),
});

const contentArrays = {
  images: z.array(ImageSchema).default([]),
  videos: z.array(VideoSchema).default([]),

  scripture_list: z.array(ScriptureSchema).default([]),
  outline_chain: z.array(OutlineLinkSchema).default([]),
  concept_lexicon: z.array(ConceptEntrySchema).default([]),
  practices: z.array(PracticeSchema).default([]),
  mind_movies: z.array(MindMovieSchema).default([]),
  mishnah_catechesis: z.array(MishnahCatechesisSchema).default([]),
  hand_gistures: z.array(HandGistureSchema).default([]),

  youtube: z.array(SimpleMediaSchema).default([]),
  podcast: z.array(SimpleMediaSchema).default([]),

  block_talk_content: resources(),
  homeschooling_supporting_content: resources(),
  board_game_content: resources(),
  childrens_content: resources(),
  base_sketch: resources(),
};

// ── master documents ─────────────────────────────────────────────────────────

const BaseSchema = z
  .object({
    title: z.string(),
    number: z.number().int().min(BASE_MIN).max(BASE_MAX),
    part_parent: z.number().int().min(1).max(5).optional(),
    short_description: z.string().default(''),
    long_description: z.string().default(''),

    google_docs_url: z.string().url().optional(),
    google_slides_url: z.string().url().optional(),
    booklet_chapter_url: z.string().url().optional(),
    childrens_book_url: z.string().url().optional(),

    ...contentArrays,

    base_body: z.string().default(''),
  })
  .superRefine((base, ctx) => {
    if (base.part_parent === undefined && !PARTLESS_BASES.includes(base.number)) {
      ctx.addIssue({ code: 'custom', path: ['part_parent'], message: `required for base ${base.number}` });
    }
  });

const containerHeader = {
  title: z.string(),
  short_description: z.string().default(''),
  long_description: z.string().default(''),
  google_docs_url: z.string().url().optional(),
  google_slides_url: z.string().url().optional(),
};

const PartSchema = z.object({
  ...containerHeader,
  number: z.number().int().min(1).max(5),
  ...containerArrays('part'),
  part_body: z.string().default(''),
});

const DivisionSchema = z.object({
  ...containerHeader,
  number: z.number().int().min(1).max(2),
  ...containerArrays('division'),
  division_body: z.string().default(''),
});

const OverviewSchema = z.object({
  ...containerHeader,
  ...containerArrays('overview'),
  overview_body: z.string().default(''),
});

// The `<!-- meta:TYPE -->` tag decides which schema an issue is routed to.
// A bare <!-- meta --> means base. `meta` lists the scalar attributes a meta
// tag of that type may carry, `blocks` the blocks it accepts, and `body` is
// the field freeform text lands in.
const COMMON_META = ['title', 'short_description', 'long_description', 'google_docs_url', 'google_slides_url'];

const DOC_TYPES = {
  base: {
    schema: BaseSchema,
    meta: [...COMMON_META, 'number', 'part_parent', 'booklet_chapter_url', 'childrens_book_url'],
    blocks: Object.keys(contentArrays),
    body: 'base_body',
    labels: ['FOUNDATION BASE', 'FOUNDATION MEETING'],
  },
  part: {
    schema: PartSchema,
    meta: [...COMMON_META, 'number'],
    blocks: Object.keys(containerArrays('part')),
    body: 'part_body',
    labels: ['FOUNDATION PART', 'FOUNDATION PART OVERVIEW'],
  },
  division: {
    schema: DivisionSchema,
    meta: [...COMMON_META, 'number'],
    blocks: Object.keys(containerArrays('division')),
    body: 'division_body',
    labels: ['FOUNDATION DIVISION'],
  },
  overview: {
    schema: OverviewSchema,
    meta: [...COMMON_META],
    blocks: Object.keys(containerArrays('overview')),
    body: 'overview_body',
    labels: ['FOUNDATION COURSE OVERVIEW'],
  },
};

// Every block name any type accepts.
const BLOCK_FIELDS = [...new Set(Object.values(DOC_TYPES).flatMap(t => t.blocks))];

// Spellings accepted after "meta:".
const TYPE_ALIASES = { course: 'overview', 'course-overview': 'overview', course_overview: 'overview' };

function resolveType(name) {
  const key = String(name || '').toLowerCase();
  const type = TYPE_ALIASES[key] || key;
  return DOC_TYPES[type] ? type : null;
}

// Kept for callers that only care about bases.
const META_FIELDS = DOC_TYPES.base.meta;

function formatZodError(error) {
  return error.issues.map(issue => `${issue.path.join('.') || 'base'}: ${issue.message}`);
}

module.exports = {
  BASE_MIN,
  BASE_MAX,
  PARTLESS_BASES,
  PART_RANGES,
  BLOCK_FIELDS,
  META_FIELDS,
  DOC_TYPES,
  resolveType,
  expectedPart,
  formatZodError,
  BaseSchema,
  PartSchema,
  DivisionSchema,
  OverviewSchema,
};
