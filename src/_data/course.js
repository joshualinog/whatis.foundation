function range(start, end, title, description, details) {
  return Array.from({ length: end - start + 1 }, (_, index) => {
    const number = start + index;
    return {
      number,
      title,
      description,
      details,
      anchor: `meeting-${number}`,
    };
  });
}

const beginningElements = [
  {
    from: 1,
    to: 7,
    title: 'God is Light',
    description: 'A sustained focus on the person of God, love, and the living presence of light.',
    details: 'Explore the heart of God as light, the first practices of presence, and the foundational themes of the course.',
  },
  {
    from: 8,
    to: 13,
    title: 'Prism Basics',
    description: 'The prism is the travel companion, introducing the five WHs and the basic creative patterns.',
    details: 'Learn the core lexicon and the structural patterns that form the ten words and the course journey.',
  },
  {
    from: 14,
    to: 18,
    title: 'Two Tablets',
    description: 'The introduction of the ten words and the ten-are phrase through the two tablets.',
    details: 'Root the journey in divine instruction and the sacred word framework that informs the training.',
  },
  {
    from: 19,
    to: 22,
    title: 'Rainbow Staircase',
    description: 'The staircase of light, the seven spaces, and the temple pattern come into view.',
    details: 'Move into the first pattern of movement and form as the course prepares for main training.',
  },
];

const trainingTitles = [
  'A Word in the Space',
  'Practice and Presence',
  'Discernment and Body',
  'The Sacred Path',
  'Inner Seeing',
  'Service and Form',
  'Fullness in Light',
];

const finalMeetingTitles = [
  'Becoming Light',
  'Priesthood',
  'APESI: Apostle',
  'APESI: Prophet',
  'APESI: Evangelist',
  'APESI: Shepherd',
  'APESI: Instructor',
];

const course = {
  title: 'whatis.foundation',
  description: 'A sacred educational course built around a parable of light, the prism, the tablets, and the staircase of ascent.',
  introduction: 'This course is arranged as 99 meetings with a clear progression: the beginning elements (meetings 1–22), the main training cycle (meetings 23–92), and the final ministry initiation (meetings 93–99).',
  themes: [
    'God is light',
    'The prism guides our travel',
    'The two tablets carry the ten words',
    'The rainbow is a staircase of light',
    'Guided forward, we become light',
  ],
  sections: [
    {
      id: 'beginning-elements',
      title: 'Beginning Elements',
      subtitle: 'Meetings 1–22',
      overview: 'The first 22 meetings are the course foundation. They center on God as light, the prism, the ten words, and the temple staircase.',
      meetings: beginningElements.flatMap(item => range(item.from, item.to, item.title, item.description, item.details)),
    },
    {
      id: 'main-training',
      title: 'Main Training',
      subtitle: 'Meetings 23–92',
      overview: 'Seventy meetings of embodied practice exploring the ten words through the seven spaces. This is where training, discernment, and practical formation deepen.',
      meetings: Array.from({ length: 70 }, (_, index) => {
        const number = 23 + index;
        return {
          number,
          title: trainingTitles[index % trainingTitles.length],
          description: 'A sustained training session in the main cycle of the course.',
          details: 'Each meeting includes instruction, discussion, practice, and scripture for ongoing formation.',
          anchor: `meeting-${number}`,
        };
      }),
    },
    {
      id: 'ministerial-initiation',
      title: 'Ministerial Initiation',
      subtitle: 'Meetings 93–99',
      overview: 'The final seven meetings prepare participants for priesthood, leadership, and a ministry of instruction and service.',
      meetings: finalMeetingTitles.map((title, index) => ({
        number: 93 + index,
        title,
        description: 'A final meeting focused on leadership formation and spiritual maturity.',
        details: 'These closing sessions declare readiness for ministry and the capacity to teach, guide, and serve.',
        anchor: `meeting-${93 + index}`,
      })),
    },
  ],
};

module.exports = course;
