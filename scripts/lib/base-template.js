'use strict';

const { DOC_TYPES } = require('./schema');

const esc = s => String(s == null ? '' : s).replace(/"/g, '&quot;').replace(/\s+/g, ' ').trim();

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

module.exports = { buildTemplate, buildBaseTemplate };
