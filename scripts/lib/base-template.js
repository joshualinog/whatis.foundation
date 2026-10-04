'use strict';

const { DOC_TYPES } = require('./schema');

// Only what would break a tag is escaped: a quote, a literal "-->" (it would end the comment), and an "&" that already looks like an entity.
const esc = s => String(s == null ? '' : s).replace(/&(?=(?:lt|gt|quot|amp);)/g, '&amp;').replace(/"/g, '&quot;').replace(/-->/g, '--&gt;').replace(/\s+/g, ' ').trim();

/**
 * The tag skeleton for a new issue of the given type: a `meta:TYPE` wrapper
 * carrying every scalar attribute, an empty block for every array field, and
 * a body block for freeform handwriting. Empty attributes are ignored by the
 * parser, so the skeleton is valid as written.
 *
 * @param {'base'|'part'|'division'|'overview'} type
 * @param {object} [values] attribute values to pre-fill
 */
function buildTemplate(type, values = {}) {
  const def = DOC_TYPES[type];
  if (!def) throw new Error(`unknown document type "${type}"`);
  const meta = def.meta.map(field => `  ${field}="${esc(values[field])}"`).join('\n');
  const blocks = def.blocks.map(name => `<!-- block:${name} -->\n<!-- /block:${name} -->`).join('\n\n');
  const bodyBlock = `${type}-body`;
  return `<!-- meta:${type}\n${meta}\n-->\n\n${blocks}\n\n<!-- block:${bodyBlock} -->\n<!-- /block:${bodyBlock} -->\n\n<!-- /meta:${type} -->\n`;
}

const buildBaseTemplate = values => buildTemplate('base', values);

// The compact form: just the full title, nothing else filled in yet.
const buildTitleOnly = title => `<!-- meta:base title="${esc(title)}"--><!--/meta:base-->`;

module.exports = { buildTemplate, buildBaseTemplate, buildTitleOnly };
