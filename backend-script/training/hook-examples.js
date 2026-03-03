/**
 * Soch AI Script Generator - Hook Training Examples
 * 
 * These are few-shot examples for each hook type that help the Gemini model
 * understand the exact style and quality expected for each psychological trigger.
 */

const HOOK_EXAMPLES = {
  patternInterrupt: [
    {
      topic: "I won't come home until I become successful",
      language: "English",
      hook: "I'm not coming back home.",
      why: "Short. Disruptive. No explanation. Makes the viewer stop and think."
    },
    {
      topic: "Why most startups fail in first year",
      language: "English",
      hook: "Your startup is already dead. You just don't know it yet.",
      why: "Contradiction to the founder's belief. Pattern break."
    },
    {
      topic: "Ghar chhodke success dhundhna",
      language: "Hinglish",
      hook: "Maine ghar chhodne ka decision liya. Kisi ne support nahi kiya.",
      why: "Direct statement that disrupts comfort zone thinking."
    }
  ],

  personalStakes: [
    {
      topic: "Leaving a stable job for entrepreneurship",
      language: "English",
      hook: "If I fail, I lose everything. My savings, my reputation, my family's trust.",
      why: "Emotionally costly. Real risk. Identity at stake."
    },
    {
      topic: "Taking a gap year for passion",
      language: "Hindi",
      hook: "Agar yeh galat decision hua, toh sab kuch khatam.",
      why: "Stakes are personal, immediate, and painful."
    },
    {
      topic: "Moving to a new city alone",
      language: "Hinglish",
      hook: "Meri family ne bola agar gaya toh wapas mat aana.",
      why: "Personal sacrifice and real emotional pain."
    }
  ],

  curiosityGap: [
    {
      topic: "How I made my first 1 lakh online",
      language: "Hinglish",
      hook: "Ek cheez thi jo sabse different thi mere approach mein…",
      why: "Withholds the critical information. Viewer has to keep watching."
    },
    {
      topic: "Why I quit my dream company",
      language: "English",
      hook: "There's a reason nobody talks about this side of dream jobs…",
      why: "Incomplete sentence. Promise of revelation."
    },
    {
      topic: "Secret to growing on Instagram",
      language: "English",
      hook: "I discovered something that changed everything. And it's not what you think.",
      why: "Sets up curiosity. Implies unexpected revelation."
    }
  ],

  socialProofFomo: [
    {
      topic: "Why you should start creating content now",
      language: "Hinglish",
      hook: "Mere saare dost settle ho gaye. Main abhi bhi risk le raha hoon.",
      why: "Social comparison. Makes viewer question their own path."
    },
    {
      topic: "Why everyone is learning AI right now",
      language: "English",
      hook: "Everyone from my town settled for comfort. I didn't.",
      why: "FOMO trigger. Everyone else is ahead."
    },
    {
      topic: "Building personal brand in 2025",
      language: "Hindi",
      hook: "Jo log 2 saal pehle shuru kiye, aaj unke paas audience hai. Aur tum?",
      why: "Direct comparison creating urgency."
    }
  ],

  immediateThreatReward: [
    {
      topic: "Stop wasting time on social media",
      language: "English",
      hook: "Every hour you spend scrolling, someone else is building your dream life.",
      why: "Immediate threat. Creates instant urgency."
    },
    {
      topic: "I won't come home until I become successful",
      language: "English",
      hook: "If I go back now, I'll stay average forever.",
      why: "Consequence is immediate and permanent."
    },
    {
      topic: "Financial planning for youth",
      language: "Hinglish",
      hook: "Agar abhi invest nahi kiya toh 10 saal baad regret karoge. Pakka.",
      why: "Threat of future regret with confident assertion."
    }
  ]
};

/**
 * Full script example (for the model to understand complete output format)
 */
const FULL_SCRIPT_EXAMPLE = {
  input: {
    topic: "Debate between Modi and Dhruv Rathee",
    duration: "1 minute",
    language: "Hinglish",
    audience: "General",
    emotionalIntensity: 3,
    tone: "Confident",
    ctaEnabled: false
  },
  output: {
    hook: {
      type: "Curiosity Gap + Pattern Interrupt blend",
      text: "Agar Modi aur Dhruv Rathee ek hi stage par debate karein… toh asli jeet kiski hogi?"
    },
    body: {
      framework: "Data + Story Hybrid",
      text: "Socho ek taraf Prime Minister Narendra Modi — experienced political leader, strong public speaker.\n\nDoosri taraf Dhruv Rathee — YouTube commentator, fact-based breakdowns, aur digital audience par strong influence.\n\nModi ka strength hai political experience, governance decisions, aur emotional public appeal.\nDhruv ka strength hai research presentation, statistics aur structured argument building.\n\nDebate interesting tab hoti jab:\nOne side policy aur vision defend kare,\nAur doosri side data se question kare.\n\nPublic reaction bhi divided hoti — Traditional supporters vs digital generation viewers.\n\nUltimately, debate sirf personality ka nahi hota.\nIt's about narrative control vs analytical breakdown.\n\nAur real winner? Wohi jiska argument audience ko zyada convincing lage."
    },
    cta: {
      included: false,
      text: ""
    },
    metadata: {
      hookType: "Curiosity Gap + Pattern Interrupt",
      frameworkUsed: "Data + Story Hybrid",
      wordCount: 165,
      estimatedDuration: "1 minute",
      targetAudience: "General",
      language: "Hinglish",
      tone: "Confident",
      emotionalIntensity: 3
    },
    qualityScores: {
      hookStrength: 7.2,
      retentionPotential: 6.8,
      emotionalIntensityMatch: 7.0,
      ctaAlignment: 0
    }
  }
};

module.exports = { HOOK_EXAMPLES, FULL_SCRIPT_EXAMPLE };
