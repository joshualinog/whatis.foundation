#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoEnv = process.env.GITHUB_REPOSITORY || 'joshualinog/whatis.foundation';
const [OWNER, REPO] = repoEnv.split('/');
const OUT_DIR = path.join(process.cwd(), 'src', 'data', 'posts');

function slugify(s) {
  return s.toString().toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

function writePostJson(issue) {
  const num = String(issue.number).padStart(5,'0');
  const slug = issue.title ? slugify(issue.title) : `issue-${issue.number}`;
  const filename = `${num}-${slug}.json`;
  const outfile = path.join(OUT_DIR, filename);

  const post = {
    id: issue.number,
    title: issue.title || '',
    slug,
    author: issue.user && issue.user.login ? issue.user.login : '',
    createdAt: issue.created_at,
    updatedAt: issue.updated_at || issue.created_at,
    labels: (issue.labels || []).map(l => (l.name || l)),
    status: ((issue.labels || []).some(l => (l.name || l) === 'draft') ? 'draft' : 'published'),
    excerpt: (issue.body || '').split('\n\n')[0].replace(/\n/g,' '),
    content: issue.body || '',
    raw_issue: {
      url: issue.html_url,
    },
  };

  fs.writeFileSync(outfile, JSON.stringify(post, null, 2) + '\n', 'utf8');
  console.log('wrote', outfile);
}

function mkdirp(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function fetchAll() {
  const cmd = `gh api -X GET "/repos/${OWNER}/${REPO}/issues?labels=contentPost&state=all&per_page=100"`;
  const out = execSync(cmd, { encoding: 'utf8' });
  return JSON.parse(out);
}

function fetchSingle(number) {
  const cmd = `gh api -X GET "/repos/${OWNER}/${REPO}/issues/${number}"`;
  const out = execSync(cmd, { encoding: 'utf8' });
  return JSON.parse(out);
}

if (process.argv[2] === 'delete') {
  const num = String(process.argv[3]).padStart(5, '0');
  const files = fs.readdirSync(OUT_DIR).filter(f => f.startsWith(`${num}-`) && f.endsWith('.json'));
  files.forEach(f => {
    fs.unlinkSync(path.join(OUT_DIR, f));
    console.log('Deleted', f, 'because issue deleted');
  });
  process.exit(0);
}

function main() {
  mkdirp(OUT_DIR);

  const single = process.env.ISSUE_NUMBER;
  if (single) {
    console.log('Fetching single issue', single);
    const issue = fetchSingle(single);
    const hasLabel = (issue.labels || []).some(l => (l.name || l) === 'contentPost');
    if (hasLabel) {
      writePostJson(issue);
    } else {
      const num = String(issue.number).padStart(5, '0');
      const files = fs.readdirSync(OUT_DIR).filter(f => f.startsWith(`${num}-`) && f.endsWith('.json'));
      files.forEach(f => {
        fs.unlinkSync(path.join(OUT_DIR, f));
        console.log('Deleted', f, 'because label removed');
      });
    }
    return;
  }

  console.log('Fetching all issues labeled contentPost');
  const issues = fetchAll();
  if (!Array.isArray(issues)) {
    console.error('unexpected response', issues);
    process.exit(1);
  }

  const currentIds = new Set(issues.map(i => i.number));
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.json'));
  files.forEach(f => {
    const num = parseInt(f.split('-')[0], 10);
    if (!currentIds.has(num)) {
      fs.unlinkSync(path.join(OUT_DIR, f));
      console.log('Deleted', f);
    }
  });

  issues.forEach(i => writePostJson(i));
}

main();
