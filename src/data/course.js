const course = {
  intro: {
    number: 0,
    title: 'introduction and overview and purpose',
    description: 'Session zero introduces the course, its purpose, and the journey ahead.',
    details: 'This opening session prepares participants for the full 99-meeting course.',
  },

  parts: [
    {
      id: 'part-1',
      number: 1,
      title: 'God is Light',
      subtitle: 'Meetings 1–7',
      overview: 'Part one is the most foundational and the heaviest. It is saturated in the identity of God as light and as love. Yeshuah of Nazareth is the light of the world, the meeting facilitator, the soul of creation. Light leads creation into a face-to-face encounter with God.',
      color: 'from-amber-500 to-orange-600',
      labelColor: 'text-amber-200',
      meetings: [
        {
          number: 1,
          title: 'God is light 1 — what is light? Light is love',
          description: 'Light is the love leader. God is light. God is love. Light is love.',
          details: "Explore the sun as the metaphor of God's movement toward creation. Yeshuah is the light of the world, the great meeting facilitator, descending into darkness to lead us into union with God.",
        },
        {
          number: 2,
          title: 'God is light 2 — what is love? Mapping love',
          description: 'Love is not a state. Love is an ordered activity.',
          details: 'Build a map of love: the lover seeks, joins, and attaches. The loved receives and responds in kind. The result is a new shape — the two becoming one, sharing being.',
        },
        {
          number: 3,
          title: 'God is light 3 — THE 3 WITHS OF LOVE / LOVE AND CREATION',
          description: 'The three withs of creation: God alone, God with creation, God within creation.',
          details: 'GOD WANTS TO SEEK YOU — the Father, glory beyond. GOD WANTS TO JOIN WITH YOU — the Son, the word and soul of creation. GOD WANTS TO ATTACH WITHIN YOU — the Spirit, glory within the created microcosm.',
        },
        {
          number: 4,
          title: 'God is light 4 — God loves first. Yahweh formula. the shape of love',
          description: 'The Yahweh formula: God revealing God. God is always the lover who initiates.',
          details: "Study the shapes God takes to do the activity of love. The face of God revealing himself. The pre-shaping required for each step of the lover's movement.",
        },
        {
          number: 5,
          title: "God is light 5 — BELOVED. Love's Reflection: the Image of love",
          description: 'Who is God approaching when he approaches us? You are beloved.',
          details: "You are God's beloved child. You are pleasing to God. You are chosen by God. This is our true identity before him — the word of the gospel.",
        },
        {
          number: 6,
          title: 'God is light 6 — the shema / loving love back',
          description: 'The Shema is the response of the loved to the lover.',
          details: 'Being the responder to God the lover when we are the loved. The shema as the form of loving love back.',
        },
        {
          number: 7,
          title: 'God is light 7 — give my flesh and blood / neighbor love',
          description: 'Giving my flesh and blood as a meal to my neighbor.',
          details: 'Being the responder to God the lover when we are the loved through creation — neighbor love, love neighbor as yourself. The final movement of God is light, bridging into the prism.',
        },
      ],
    },

    {
      id: 'part-2',
      number: 2,
      title: 'The Prism',
      subtitle: 'Meetings 8–12',
      overview: "Part two introduces the prism — God's tool for travel. The five Ws provide the lexicon needed to understand the ten words and to move through the course with clarity and discernment.",
      color: 'from-violet-500 to-purple-700',
      labelColor: 'text-violet-200',
      meetings: [
        {
          number: 8,
          title: 'Prism 1 — Who',
          description: 'The first W: Who.',
          details: 'Identify the key persons, subjects, and agents in the course story and in the sacred narrative.',
        },
        {
          number: 9,
          title: 'Prism 2 — What',
          description: 'The second W: What.',
          details: 'Clarify the forms, objects, and content of the sacred teaching.',
        },
        {
          number: 10,
          title: 'Prism 3 — Where',
          description: 'The third W: Where.',
          details: 'Explore the spaces, places, and settings of the course journey.',
        },
        {
          number: 11,
          title: 'Prism 4 — When',
          description: 'The fourth W: When.',
          details: 'Consider timing, sequence, and the rhythm of sacred movement.',
        },
        {
          number: 12,
          title: 'Prism 5 — Why',
          description: 'The fifth W: Why.',
          details: 'Examine the purpose, intention, and direction of the sacred journey. Why completes the prism and opens the door to the tablets.',
        },
      ],
    },

    {
      id: 'part-3',
      number: 3,
      title: 'The Tablets',
      subtitle: 'Meetings 13–22',
      overview: 'Part three introduces the two tablets — the prism God gave us. The ten words form the skeletal framework for all of the main training ahead. Familiarize and memorize each beginning element before fitting them together in the main training.',
      color: 'from-sky-500 to-blue-700',
      labelColor: 'text-sky-200',
      meetings: Array.from({ length: 10 }, (_, i) => ({
        number: 13 + i,
        title: `2 Tablets — Word ${i + 1}`,
        description: `The two tablets: Word ${i + 1}.`,
        details: 'Explore this word of the two tablets through the prism. Familiarize and memorize this beginning element before fitting it together in the main training.',
      })),
    },

    {
      id: 'part-4',
      number: 4,
      title: 'The Rainbow',
      subtitle: 'Meetings 23–29',
      overview: 'Part four reveals the rainbow as a staircase of light. The seven spaces descend from violet to red, mapping conscience, mind, heart, gut, members, people, and earth onto their corresponding spaces in the temple.',
      color: 'from-emerald-500 to-teal-700',
      labelColor: 'text-emerald-200',
      meetings: [
        {
          number: 23,
          title: 'The Rainbow — Space 7 — Violet | Conscience | Ark',
          description: 'The highest space: conscience, mapped to the Ark.',
          details: 'Violet light. The innermost dimension of the human being — conscience — corresponds to the Ark of the Covenant, the dwelling place of God.',
        },
        {
          number: 24,
          title: 'The Rainbow — Space 6 — Indigo | Mind | Holy of Holies',
          description: 'Space 6: mind, mapped to the Holy of Holies.',
          details: 'Indigo light. The mind as the gate of the innermost sanctuary. The Holy of Holies is the space where the mind meets the divine.',
        },
        {
          number: 25,
          title: 'The Rainbow — Space 5 — Blue | Heart | Holy Place',
          description: 'Space 5: heart, mapped to the Holy Place.',
          details: 'Blue light. The heart as the meeting place of God and humanity. The Holy Place holds the lampstand, the bread, and the altar of incense.',
        },
        {
          number: 26,
          title: 'The Rainbow — Space 4 — Green | Gut | Courtyard',
          description: 'Space 4: gut, mapped to the Courtyard.',
          details: 'Green light. The gut as the seat of instinct and vitality, corresponding to the outer courtyard where offering and washing occur.',
        },
        {
          number: 27,
          title: 'The Rainbow — Space 3 — Yellow | Members | Levitical Barrier',
          description: 'Space 3: members, mapped to the Levitical Barrier.',
          details: 'Yellow light. The members — hands, feet, voice — as the active expression of the inner life, bounded by the Levitical zone of service.',
        },
        {
          number: 28,
          title: 'The Rainbow — Space 2 — Orange | People | Tents of Israel',
          description: 'Space 2: people, mapped to the Tents of Israel.',
          details: 'Orange light. The relational and communal dimension, corresponding to the encampment of the tribes around the tabernacle.',
        },
        {
          number: 29,
          title: 'The Rainbow — Space 1 — Red | Earth | The Land of Israel',
          description: 'Space 1: earth, mapped to the Land of Israel.',
          details: 'Red light. The outermost space — the physical world, the land, the ground of all being — is the foundation from which we ascend.',
        },
      ],
    },

    {
      id: 'part-5',
      number: 5,
      title: 'We Become Light',
      subtitle: 'Meetings 30–99',
      overview: 'Part five is the main training: seventy meetings exploring the ten words through each of the seven spaces. Word by word, space by space, we climb the rainbow staircase and become light.',
      color: 'from-rose-500 to-pink-700',
      labelColor: 'text-rose-200',
      meetings: Array.from({ length: 70 }, (_, i) => {
        const n = 30 + i;
        const word = Math.floor(i / 7) + 1;
        const space = 7 - (i % 7);
        return {
          number: n,
          title: `W${word}S${space} — Word ${word} Space ${space}`,
          description: `Explore word ${word} through space ${space}.`,
          details: 'Each meeting includes 30 minutes of instruction, 15 minutes of question and discussion, and 15 minutes of practice. Scripture passages anchor each session.',
        };
      }),
    },
  ],

  outro: {
    title: 'Baptism & Laying on of Hands',
    description: 'Declare mature. Become an instructor. Being the light to others. Building on our foundation. Training and discipling others.',
  },
};

module.exports = course;

