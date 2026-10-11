// A short hash of the built stylesheet, appended to its URL in layout.njk
// (`/styles.css?v=…`). GitHub Pages lets browsers keep a file for 10 minutes, so
// without it a visitor can get a new page with the previous stylesheet, which
// breaks any layout that relies on newly added classes.
// `npm run build` writes docs/styles.css before Eleventy runs.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', '..', 'docs', 'styles.css');

module.exports = fs.existsSync(file)
  ? crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 10)
  : String(Date.now());
