const exactBeginningMeetings = [
  {
    number: 0,
    title: 'introduction and overview and purpose',
    description: 'A course introduction and overview of purpose.',
    details: 'Meeting 0 presents the course structure, meaning, and intention.',
  },
  {
    number: 1,
    title: 'presenting the parable light→ rainbow → light',
    description: 'Introduce the parable that grounds the entire course.',
    details: 'This meeting presents the core narrative of light, rainbow, and ascent.',
  },
  {
    number: 2,
    title: 'God is light 1 - what is light? Light is love',
    description: 'Define light as love and begin the God is light series.',
    details: 'Explore God is light, God is love, and the identity of light as love. Study how light is the activity of love that meets the other.',
  },
  {
    number: 3,
    title: 'God is light 2 what is love? Mapping love',
    description: 'Map the activity of love as a series of actions.',
    details: 'Trace the lover and the loved through the steps of seeking, joining, and attaching, and how love forms a new shared shape.',
  },
  {
    number: 4,
    title: 'God is light 3- THE 3 WITHS OF LOVE / LOVE AND CREATION',
    description: 'Explore the three withs of love and the relationship of God and creation.',
    details: 'Distinguish God without creation, God with creation, and God within creation, and see how the one becomes many in the being space.',
  },
  {
    number: 5,
    title: 'God is light 4 - God loves first. Yahweh formula. the shape of love - the shapes that are needed',
    description: 'Reveal the Yahweh formula and the shape of love in divine action.',
    details: 'Study the face of God revealing himself, the lover initiating, and the pattern of love as an active, ordered movement.',
  },
  {
    number: 6,
    title: 'God is light 5 - BELOVED. when God is the lover who is God approaching, who is the loved?',
    description: 'Reflect on the beloved identity and divine approbation.',
    details: 'Consider our true identity before God: beloved, pleasing, chosen, and invited into the relationship of love.',
  },
  {
    number: 7,
    title: 'God is light 6- the shema / loving love back',
    description: 'Practice the Shema as the response of loving love back.',
    details: 'Learn how to respond as the loved by loving God back, and enter the form of reciprocal love.',
  },
  {
    number: 8,
    title: 'God is light 7 - give my flesh and blood respond to God neighbor love love neighbor as yourself',
    description: 'Bring neighbor love into embodied response to God.',
    details: 'Explore how flesh and blood respond to God by loving neighbor as yourself, completing the God-is-light pathway in action.',
  },
  {
    number: 9,
    title: "THE PRISM - God's tool for travel (introducing the 5 W's)",
    description: 'Introduce the prism as the tool for travel and the five Ws.',
    details: 'This session launches the prism phase of the course.',
  },
  {
    number: 10,
    title: 'Prism 1 - Who ( the 5 Ws)',
    description: 'The first prism session focuses on Who.',
    details: 'Identify the key subjects and agents of the course story.',
  },
  {
    number: 11,
    title: 'Prism 2 - What',
    description: 'The second prism session focuses on What.',
    details: 'Clarify the form and content of the course teaching.',
  },
  {
    number: 12,
    title: 'Prism 3 - Where',
    description: 'The third prism session focuses on Where.',
    details: 'Explore the spaces and settings of the course journey.',
  },
  {
    number: 13,
    title: 'Prism 4 - When',
    description: 'The fourth prism session focuses on When.',
    details: 'Consider timing, sequence, and the rhythm of the course.',
  },
  {
    number: 14,
    title: 'Prism 5 - Why',
    description: 'The fifth prism session focuses on Why.',
    details: 'Examine the purpose and intention behind the journey.',
  },
  {
    number: 15,
    title: 'THE TABLETS : the 10 words, the prism God gave us',
    description: 'Introduce the tablets as the ten words given through the prism.',
    details: 'This meeting begins the tablets phase of the course.',
  },
  {
    number: 16,
    title: 'Tablet 1 - Heaven',
    description: 'The first tablet session explores Heaven.',
    details: 'Consider the first word in the context of divine reality.',
  },
  {
    number: 17,
    title: 'Tablet 2 - Earth',
    description: 'The second tablet session explores Earth.',
    details: 'Reflect on the second word and its grounding in creation.',
  },
  {
    number: 18,
    title: 'Ashreis?',
    description: 'A focused session on the tablets, the ten words, and the emerging pattern.',
    details: 'This meeting explores the meaning of the third tablet theme.',
  },
  {
    number: 19,
    title: 'THE RAINBOW - A Staircase of Light',
    description: 'Introduce the rainbow staircase as the first temple pattern.',
    details: 'This session begins the transition into the rainbow phase.',
  },
  {
    number: 20,
    title: 'THE RAINBOW - TENT & TEMPLE - THE HOUSE OF GOD',
    description: 'Explore the rainbow as tent, temple, and house of God.',
    details: 'This meeting situates the course within sacred space.',
  },
  {
    number: 21,
    title: 'Rainbow',
    description: 'Continue the rainbow sequence with an emphasis on pattern and ascent.',
    details: 'This meeting deepens the staircase of light motif.',
  },
  {
    number: 22,
    title: 'Rainbow',
    description: 'Complete the rainbow sequence before the main training phase.',
    details: 'This session anchors the beginning elements in the temple pattern.',
  },
];

const mainTrainingMeetings = Array.from({ length: 70 }, (_, index) => {
  const number = 23 + index;
  const word = Math.ceil((index + 1) / 7);
  const space = 7 - ((index) % 7);
  return {
    number,
    title: `W${word}S${space} - Word ${word} Space ${space}`,
    description: 'A single meeting in the main training cycle focusing on one word and one space.',
    details: 'Practice and explore the selected word and space as part of the course rhythm.',
    anchor: `meeting-${number}`,
  };
});

const finalMeetings = Array.from({ length: 7 }, (_, index) => ({
  number: 93 + index,
  title: `We become light ${index + 1}`,
  description: 'A final meeting in the ministerial initiation phase.',
  details: 'Grow into leadership, priesthood, and readiness to instruct.',
  anchor: `meeting-${93 + index}`,
}));

const course = {
  title: 'whatis.foundation',
  description: 'A sacred educational course built around a parable of light, the prism, the tablets, and the staircase of ascent.',
  introduction: 'This course is arranged around the beginning elements, the main training cycle, and the final ministerial initiation.',
  themes: [
    'God is light',
    'The prism guides our travel',
    'The tablets carry the ten words',
    'The rainbow is a staircase of light',
    'Guided forward, we become light',
  ],
  sections: [
    {
      id: 'beginning-elements',
      title: 'Beginning Elements',
      subtitle: 'Meetings 0–22',
      overview: 'The first phase introduces the course parable, the God is light series, the prism, tablets, and the rainbow staircase.',
      meetings: exactBeginningMeetings,
    },
    {
      id: 'main-training',
      title: 'Main Training',
      subtitle: 'Meetings 23–92',
      overview: 'Seventy meetings of main training exploring the 10 words through the seven spaces.',
      meetings: mainTrainingMeetings,
    },
    {
      id: 'ministerial-initiation',
      title: 'Ministerial Initiation',
      subtitle: 'Meetings 93–99',
      overview: 'The final phase prepares participants for leadership, priesthood, and instructional ministry.',
      meetings: finalMeetings,
    },
  ],
};

module.exports = course;
