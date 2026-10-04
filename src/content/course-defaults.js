// Structure of the Foundation course (issue #184).
//
//   Base 0            Introduction (Eldad)
//   Division 1        The Beginning Elements — parts 1–4, bases 1–29
//   Base 30           The Nexus — Jesus / Yeshua, the only foundation
//   Division 2        The Main Course — part 5, bases 31–100
//   Base 101          Laying on of hands (Medad)
//
// These are the defaults. Text written in the part / division / overview
// issues (see src/data/course.js) overrides them. Tailwind only generates
// classes it can see, and tailwind.config.js scans this file, so the gradient
// classes below are safe to keep here.

const parts = [
  {
    number: 1,
    division: 1,
    title: 'God Is Light',
    parable: 'God the King — the glory light man on the throne (Ezekiel 1)',
    mechanics: 'God',
    from: 1,
    to: 7,
    overview:
      'Part one is the most foundational. It is saturated in the identity of God as light and as love: the glory light being, like a man, seated on the throne. Yeshua is the light of the world, and light leads creation into a face-to-face encounter with God.',
    gradient: 'from-amber-500 to-orange-600',
    label: 'text-amber-100',
  },
  {
    number: 2,
    division: 1,
    title: 'The Prism',
    parable: 'The tiled blue stone throne — the raqia, God’s throne and chariot',
    mechanics: 'The prism — God’s tool for travel',
    from: 8,
    to: 12,
    overview:
      'Part two introduces the raqia, the prism that is God’s tool for travel and the throne of creation. The five Ws — who, what, where, when, why — give the lexicon needed to understand the ten words.',
    gradient: 'from-violet-500 to-purple-700',
    label: 'text-violet-100',
  },
  {
    number: 3,
    division: 1,
    title: 'The Two Tablets',
    parable: 'The ten words — the two sapphire tiles under His feet, God’s footstool',
    mechanics: 'The two tablets — the prism God gave us to travel',
    from: 13,
    to: 22,
    overview:
      'Part three is the ten words: two tablets, two tiles, ten toes. Heaven and earth walk in step, and the kingdom of heaven is made present on earth. These are the skeleton for all of the main training ahead.',
    gradient: 'from-sky-500 to-blue-700',
    label: 'text-sky-100',
  },
  {
    number: 4,
    division: 1,
    title: 'The Rainbow Staircase',
    parable: 'The rainbow shooting through the raqia to the prophet — the seven spaces',
    mechanics: 'The seven spaces — a rainbow, a staircase of light',
    from: 23,
    to: 29,
    overview:
      'Part four is the rainbow, a staircase of light of seven spaces. Light passing through the prism descends from violet to red, mapping conscience, mind, heart, gut, members, people and earth onto the temple, from the Ark to the land of Israel.',
    gradient: 'from-emerald-500 to-teal-700',
    label: 'text-emerald-100',
  },
  {
    number: 5,
    division: 2,
    title: 'We Become Light',
    parable: 'The prophet — the son of man, Ezekiel — invited to ascend',
    mechanics: 'The main course — guided by God upward, we become light',
    from: 31,
    to: 100,
    overview:
      'Part five is the main course: seventy bases, an inversion of the ten words and the seven spaces coming down. It rests on the ten ashrei, the beatitudes of Jesus, walked through each of the seven spaces — super happy up the rainbow staircase.',
    gradient: 'from-rose-500 to-pink-700',
    label: 'text-rose-100',
  },
];

const divisions = [
  {
    number: 1,
    title: 'The Beginning Elements',
    summary:
      'The beginning elements are the tools for the work of becoming like Jesus, our foundation and Messiah.',
    scripture: 'Hebrews 5:11 – 6:3',
    points: [],
    parts: [1, 2, 3, 4],
  },
  {
    number: 2,
    title: 'The Main Course',
    summary:
      'The work of equipping the disciples and saints to become like Yeshua, using the beginning elements as tools.',
    scripture: 'Luke 6:39–40 · Ephesians 4:11–16',
    points: [
      'The work of the course, done using the beginning elements as tools to become like Messiah.',
      'The full training, so that the disciple can be said to be fully trained.',
      'The full equipping, so that the disciple can be said to be fully equipped.',
    ],
    parts: [5],
  },
];

// The bases that stand outside the five parts.
const specials = {
  0: {
    role: 'Introduction',
    nickname: 'Eldad',
    note: 'The introduction to the whole course — Eldad, who did not show up to the seventy (Numbers 11).',
    gradient: 'from-slate-600 to-slate-800',
    label: 'text-slate-200',
  },
  30: {
    role: 'The Nexus',
    nickname: 'Jesus',
    note: 'Jesus / Yeshua, the only foundation that can be laid (1 Corinthians 3:10–17) — the nexus between the two divisions.',
    gradient: 'from-yellow-500 to-amber-700',
    label: 'text-yellow-100',
  },
  101: {
    role: 'Laying on of Hands',
    nickname: 'Medad',
    note: 'The ceremony at the end of the course — Medad, the other elder. Now you are mature; now you are an instructor.',
    gradient: 'from-slate-600 to-slate-800',
    label: 'text-slate-200',
  },
};

// The seven spaces of the rainbow staircase, keyed by space number.
const spaces = {
  7: { name: 'Violet', gradient: 'from-violet-500 to-violet-800', label: 'text-violet-100' },
  6: { name: 'Indigo', gradient: 'from-indigo-500 to-indigo-800', label: 'text-indigo-100' },
  5: { name: 'Blue', gradient: 'from-blue-500 to-blue-800', label: 'text-blue-100' },
  4: { name: 'Green', gradient: 'from-green-500 to-green-800', label: 'text-green-100' },
  3: { name: 'Yellow', gradient: 'from-yellow-500 to-yellow-700', label: 'text-yellow-50' },
  2: { name: 'Orange', gradient: 'from-orange-500 to-orange-700', label: 'text-orange-100' },
  1: { name: 'Red', gradient: 'from-red-500 to-red-800', label: 'text-red-100' },
};

module.exports = {
  name: 'whatis.foundation',
  heading: 'WHAT IS. FOUNDATION?',
  tagline: 'A sacred course in five parts and one hundred and two bases.',
  description:
    'God is light. The prism guides our travel. The tablets carry the ten words. The rainbow is a staircase of light. Guided forward, we become light.',
  parts,
  divisions,
  specials,
  spaces,
};
