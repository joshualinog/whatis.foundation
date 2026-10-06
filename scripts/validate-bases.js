#!/usr/bin/env node
'use strict';

// npm run validate — checks that
//   1. the generated issue skeletons carry every schema field and parse, for every base, part, division and the overview,
//   2. the parser handles the tag examples from the schema PDF and the meta:TYPE routing,
//   3. every synced file in src/content still satisfies its schema,
//   4. the GitHub issue templates are in step with the schema.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DOC_TYPES, formatZodError } = require('./lib/schema');
const { buildTemplate, buildTitleOnly } = require('./lib/base-template');
const { parseIssue } = require('./lib/issue-doc');
const { parseDocText } = require('./lib/tag-parser');
const titles = require('../src/data/base-titles.json');
const defaults = require('../src/content/course-defaults');

const root = path.join(__dirname, '..');
const problems = [];
const check = (label, fn) => {
  try {
    fn();
  } catch (e) {
    problems.push(`${label}: ${e.message}`);
  }
};
const parse = (title, body, label) => parseIssue({ title, body, labels: label ? [{ name: label }] : [] });

// 1. generated skeletons
check('titles', () => assert.strictEqual(titles.length, 102, `expected 102 base titles, got ${titles.length}`));
const everyField = type => [...DOC_TYPES[type].meta, ...DOC_TYPES[type].blocks, `${type}-body`];
const skeleton = (type, number, title, label) => {
  const body = buildTemplate(type, { number });
  everyField(type).forEach(f => assert(body.includes(f), `missing field ${f}`));
  const { doc, errors } = parse(title, body, label);
  assert(doc, errors.join('; '));
  assert.strictEqual(doc.type, type);
  if (number !== undefined) assert.strictEqual(doc.number, number);
};
titles.forEach(({ number }) => check(`template for base ${number}`, () => skeleton('base', number, `Base ${number}`, 'FOUNDATION BASE')));
defaults.parts.forEach(p => check(`template for part ${p.number}`, () => skeleton('part', p.number, `Part ${p.number}`, 'FOUNDATION PART')));
defaults.divisions.forEach(d => check(`template for division ${d.number}`, () => skeleton('division', d.number, `Division ${d.number}`, 'FOUNDATION DIVISION')));
check('template for overview', () => skeleton('overview', undefined, 'Course overview', 'FOUNDATION COURSE OVERVIEW'));

// titles can hold characters that would end a tag, such as "-->" in base 30
titles.forEach(t => check(`title round trip for base ${t.number}`, () => {
  const { doc, errors } = parse(`Base ${t.number}`, buildTemplate('base', { number: t.number, long_title: t.title }), 'FOUNDATION BASE');
  assert(doc, errors.join('; '));
  assert.strictEqual(doc.long_title, t.title.replace(/\s+/g, ' ').trim());
}));

// the compact form written into every base issue: just the full title
titles.forEach(t => check(`compact title for base ${t.number}`, () => {
  const body = buildTitleOnly(t.title);
  assert(/^<!-- base:long_title -->[^\n]*<!-- \/base:long_title -->$/.test(body), 'unexpected shape');
  const { doc, errors } = parse(`Base ${t.number} — Short`, body, 'FOUNDATION BASE');
  assert(doc, errors.join('; '));
  assert.strictEqual(doc.long_title, t.title.replace(/\s+/g, ' ').trim());
  assert.strictEqual(doc.title, 'Short');
  assert.strictEqual(doc.number, t.number);
}));

// 2. parser behaviour
check('resource item aliases + upsert', () => {
  const { raw, warnings } = parseDocText(`
<!-- meta:base title="T" number="3" -->
free text
<!-- block:board_game_content -->
<!-- item:game title="Catan" url="https://boardgamegeek.com/boardgame/13/catan" -->
Trading.
<!-- /item:game -->
<!-- item:activity order="2" title="Blocks" image_urls="https://a.io/1.png" -->
First.
<!-- /item:activity -->
<!-- item:content order="2" image_urls="https://a.io/2.png" -->
Second.
<!-- /item:content -->
<!-- /block:board_game_content -->
<!-- /meta:base -->`);
  assert.deepStrictEqual(warnings, []);
  assert.strictEqual(raw.base_body, 'free text');
  assert.strictEqual(raw.board_game_content.length, 2);
  const merged = raw.board_game_content.find(i => i.order === 2);
  assert.strictEqual(merged.text, 'First.\n\nSecond.');
  assert.strictEqual(merged.image_urls, 'https://a.io/1.png,https://a.io/2.png');
});
check('outline sublink base_prop_refs', () => {
  const body = `<!-- block:scripture_list --><!-- item:scripture ref="John 1:5" -->God is light.<!-- /item:scripture --><!-- /block:scripture_list -->
<!-- block:concept_lexicon --><!-- item:concept_entry term="Light" -->d<!-- /item:concept_entry --><!-- /block:concept_lexicon -->
<!-- block:outline_chain -->
<!-- item:link order="1" -->Intro<!-- /item:link -->
<!-- item:sublink order="1" order_parent="1" base_prop_refs="scripture:John 1:5, concept_entry:light, scripture:1, image:2, nope" -->Read<!-- /item:sublink -->
<!-- /block:outline_chain -->`;
  const { doc, errors, warnings } = parse('Base 2', body);
  assert(doc, errors.join('; '));
  const sub = doc.outline_chain[0].sublinks[0];
  assert.deepStrictEqual(sub.base_prop_refs, ['scripture:John 1:5', 'concept_entry:light', 'scripture:1', 'image:2', 'nope']);
  assert.strictEqual(warnings.length, 2, warnings.join(' | '));
  assert(/image has 0|images has 0/.test(warnings[0]) && /unknown type/.test(warnings[1]), warnings.join(' | '));
});
check('concept entry', () => {
  const { doc, errors } = parse('Base 2', `<!-- block:concept_lexicon -->
<!-- item:concept_entry term="Light" image="https://x.io/a.png" references="Base 02, Base 05" -->
Definition.
<!-- /item:concept_entry -->
<!-- /block:concept_lexicon -->`);
  assert(doc, errors.join('; '));
  assert.deepStrictEqual(doc.concept_lexicon[0].references, ['Base 02', 'Base 05']);
  assert.strictEqual(doc.concept_lexicon[0].definition, 'Definition.');
});
check('meta:part with a part-body block', () => {
  const { doc, errors, warnings } = parse('Part 5', `<!-- meta:part number="5" -->
<!-- block:part-body -->
What is the interrelationship between the 10 super-happies?
<!-- /block:part-body -->
<!-- /meta:part -->`, 'FOUNDATION PART');
  assert(doc, errors.join('; '));
  assert.deepStrictEqual(warnings, []);
  assert.strictEqual(doc.type, 'part');
  assert.strictEqual(doc.number, 5);
  assert.strictEqual(doc.part_body, 'What is the interrelationship between the 10 super-happies?');
});
check('a bare meta tag is a base', () => {
  const { doc, errors } = parse('Base 4', '<!-- meta short_description="hi" -->');
  assert(doc, errors.join('; '));
  assert.strictEqual(doc.type, 'base');
  assert.strictEqual(doc.number, 4);
});
check('type mismatches and bad input are rejected', () => {
  assert(parse('Base 3', '<!-- meta:part number="5" -->', 'FOUNDATION BASE').errors.length, 'meta:part in a base issue');
  assert(parse('x', '<!-- meta:widget number="1" -->').errors.length, 'unknown meta type');
  assert(parse('x', '<!-- meta:base number="1" --><!-- meta:part number="1" -->').errors.length, 'mixed types');
  assert(parse('x', '<!-- meta:base number="500" -->').errors.length, 'base number out of range');
  assert(parse('x', '<!-- meta:part number="6" -->').errors.length, 'part number out of range');
  const unused = parse('Part 2', '<!-- block:practices --><!-- item:practice name="x" --><!-- /block:practices -->', 'FOUNDATION PART');
  assert(unused.doc && unused.warnings.some(w => w.includes('not used by part')), 'blocks a part does not carry are ignored with a warning');
  assert.strictEqual(unused.doc.practices, undefined);
  assert(parse('x', '<!-- meta:division number="3" -->').errors.length, 'division number out of range');
  assert(parse('Base 2', '<!-- block:images --><!-- item:image src="not a url" --><!-- /block:images -->').errors.length, 'bad image URL');
});

// 3. synced content
const contentDir = path.join(root, 'src', 'content');
const synced = [];
['bases', 'parts', 'divisions'].forEach(dir => {
  const full = path.join(contentDir, dir);
  if (fs.existsSync(full)) fs.readdirSync(full).filter(f => f.endsWith('.json')).forEach(f => synced.push(path.join(full, f)));
});
if (fs.existsSync(path.join(contentDir, 'overview.json'))) synced.push(path.join(contentDir, 'overview.json'));
synced.forEach(file => {
  check(path.relative(root, file), () => {
    const { issue, type, ...rest } = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert(DOC_TYPES[type], `unknown type ${type}`);
    const result = DOC_TYPES[type].schema.safeParse(rest);
    assert(result.success, result.success ? '' : formatZodError(result.error).join('; '));
  });
});

// 4. issue templates
Object.keys(DOC_TYPES).forEach(type => {
  check(`issue template ${type}.md`, () => {
    const text = fs.readFileSync(path.join(root, '.github', 'ISSUE_TEMPLATE', `${type}.md`), 'utf8');
    assert(text.includes(`<!-- meta:${type}`), `missing <!-- meta:${type}`);
    everyField(type).forEach(f => assert(text.includes(f), `missing ${f}`));
  });
});

if (problems.length) {
  console.error(problems.map(p => `✗ ${p}`).join('\n'));
  process.exit(1);
}
console.log('✓ schemas, parser, generator, issue templates and synced content are consistent');
