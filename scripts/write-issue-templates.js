#!/usr/bin/env node
'use strict';

// Regenerates .github/ISSUE_TEMPLATE/{base,part,division,overview}.md from the schema.
const fs = require('fs');
const path = require('path');
const { buildTemplate } = require('./lib/base-template');
const { DOC_TYPES } = require('./lib/schema');

const META = {
  base: { name: '🧱 Base', about: 'A Foundation course base (0–101)', title: 'Base <number> — <title>', label: 'FOUNDATION BASE' },
  part: { name: '🧩 Part', about: 'One of the five parts of the Foundation course', title: 'Part <number> — <title>', label: 'FOUNDATION PART' },
  division: { name: '🏛️ Main division', about: 'One of the two main divisions', title: 'Division <number> — <title>', label: 'FOUNDATION DIVISION' },
  overview: { name: '🗺️ Course overview', about: 'The course overview', title: 'Course overview', label: 'FOUNDATION COURSE OVERVIEW' },
};

const dir = path.join(__dirname, '..', '.github', 'ISSUE_TEMPLATE');
Object.keys(DOC_TYPES).forEach(type => {
  const m = META[type];
  const header = `---\nname: "${m.name}"\nabout: ${m.about}, written in the tag language\ntitle: "${m.title}"\nlabels: ["FOUNDATION COURSE COMPONENT", "${m.label}"]\n---\n`;
  fs.writeFileSync(path.join(dir, `${type}.md`), header + buildTemplate(type), 'utf8');
  console.log('wrote', `${type}.md`);
});
