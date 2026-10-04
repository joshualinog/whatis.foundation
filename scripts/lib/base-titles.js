'use strict';

// Helpers that turn the long, handwritten base titles (see issue #184) into a
// short card headline and a supporting subtitle.

const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'in', 'of', 'on', 'or', 'the', 'to']);

function clean(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}

// Only shouty titles are re-cased; mixed-case titles are the author's own.
function smartCase(s) {
  if (!s || /[a-z]/.test(s)) return s;
  return s
    .toLowerCase()
    .replace(/[a-z0-9']+/g, (word, offset) => {
      if (offset > 0 && SMALL_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
}

const SUPER_HAPPY = /^(.*?)\s*:\s*SPACE\s+(\d+)\s*&\s*ASHREI\/BEATITUDE\s+(\d+)\s*->\s*(.*?)\s*~\s*(.*?)\s*&\s*THE IMAGE OF GOD/i;
const LABEL_SEGMENT = /^(WH\d+|Space \d+)$/i;

/**
 * @param {string} title full base title
 * @returns {{headline: string, subtitle: string, space: number|null}}
 */
function splitTitle(title) {
  const full = clean(title);

  const sh = SUPER_HAPPY.exec(full);
  if (sh) {
    const [, headline, space, beatitude, place, faculty] = sh;
    return {
      headline: smartCase(clean(headline)),
      subtitle: smartCase(clean(`Space ${space} · Beatitude ${beatitude} · ${place} · ${faculty}`)),
      space: Number(space),
    };
  }

  let segments = full.split(/\s*,\s*|\s+\|\s+|\s+:\s+/).map(clean).filter(Boolean);
  if (segments.length === 1) segments = full.split(/\s+-\s+/).map(clean).filter(Boolean);
  if (segments.length === 0) return { headline: '', subtitle: '', space: null };

  // "WH1, Who" and "Space 7, Violet/Purple" only make sense as a pair.
  let headlineCount = 1;
  if (segments.length > 1 && LABEL_SEGMENT.test(segments[0])) headlineCount = 2;

  const headline = segments.slice(0, headlineCount).join(' — ');
  const subtitle = segments.slice(headlineCount).join(' · ');
  const spaceMatch = /^Space (\d+)$/i.exec(segments[0]);

  return {
    headline: smartCase(headline),
    subtitle: smartCase(subtitle),
    space: spaceMatch ? Number(spaceMatch[1]) : null,
  };
}

module.exports = { splitTitle, smartCase };
