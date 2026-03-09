/**
 * Script Training Examples
 * 
 * These examples demonstrate the EXACT style required per training instructions.
 * All examples follow: conversational tone, max 12 words per sentence, natural speech.
 */

const HOOK_EXAMPLES = {
  patternInterrupt: [
    {
      topic: "I won't come home until I become successful",
      language: "English",
      hook: "Most people quit here.",
      why: "Short. Disruptive. No explanation."
    },
    {
      topic: "Why most startups fail",
      language: "English", 
      hook: "Your startup is already dead.\nYou just don't know it.",
      why: "Maximum 2 lines. Maximum 12 words per line. Pattern break."
    },
    {
      topic: "Leaving home for success",
      language: "Hinglish",
      hook: "Maine ghar chhodne ka decision liya.\nKoi support nahi mila.",
      why: "Direct statement. No dramatic language."
    }
  ],

  personalStakes: [
    {
      topic: "Leaving stable job for business",
      language: "English", 
      hook: "If I fail, I lose everything.",
      why: "Real stakes. Personal cost. Under 12 words."
    },
    {
      topic: "Taking gap year", 
      language: "Hindi",
      hook: "Agar galat decision hua.\nSab kuch khatam.",
      why: "Personal fear. Real consequences."
    },
    {
      topic: "Moving to new city",
      language: "Hinglish", 
      hook: "Family ne bola.\nGaya toh wapas mat aana.",
      why: "Emotional cost. Family rejection."
    }
  ],

  curiosityGap: [
    {
      topic: "How I made money online",
      language: "Hinglish",
      hook: "Ek cheez thi.\nJo sabse different thi.",
      why: "Withholds information. Creates curiosity."
    },
    {
      topic: "Why I quit dream job",
      language: "English",
      hook: "Nobody talks about this side.\nOf dream jobs.",
      why: "Incomplete information. Promise of reveal."
    }
  ],

  socialProofFomo: [
    {
      topic: "Why start creating content now",
      language: "Hinglish", 
      hook: "Mere saare dost settle ho gaye.\nMain abhi bhi risk le raha.",
      why: "Social comparison. FOMO trigger."
    },
    {
      topic: "Learning new skills",
      language: "English",
      hook: "Everyone settled for comfort.\nI didn't.",
      why: "Direct comparison. Makes viewer question."
    }
  ],

  immediateThreatReward: [
    {
      topic: "Stop wasting time",
      language: "English",
      hook: "Every hour you waste.\nSomeone builds your dream.",
      why: "Immediate threat. Creates urgency."
    },
    {
      topic: "Start working on yourself", 
      language: "Hindi",
      hook: "Kal se shuru karunga.\nYeh sab excuse hai.",
      why: "Calls out procrastination. Direct threat."
    }
  ]
};

// Example of complete script following training instructions  
const FULL_SCRIPT_EXAMPLE = {
  input: {
    topic: "Why most startups fail in the first 3 years",
    duration: "1min",
    language: "English", 
    audience: "Entrepreneurs",
    emotionalIntensity: 3,
    tone: "Raw",
    ctaEnabled: true,
    ctaType: "Follow for more"
  },
  output: {
    hook: {
      type: "Pattern Interrupt",
      text: "Most people quit here."
    },
    body: {
      framework: "Problem → Insight → Shift",
      text: "Have you noticed something?\nSo many startups launch with excitement.\nWithin three years, they completely disappear.\n\nIt usually doesn't happen because idea was bad.\nMost startups fail because they build something.\nPeople don't actually need.\n\nFounders spend months building the product.\nAdding features, designing everything perfectly.\nBut they never test if customers pay.\n\nAnother big reason is money.\nStartups burn cash on offices, marketing, unnecessary tools.\nBefore the product even makes revenue.\n\nThen there's the team problem.\nCo-founders start with same vision.\nAfter some time disagreements happen.\nAbout money, direction, responsibilities.\n\nMany founders try to scale too early.\nInstead of focusing on first 100 loyal customers.\nThey chase thousands of users.\n\nStartups that survive do one thing differently.\nThey start small.\nListen to users constantly.\nImprove the product step by step."
    },
    cta: {
      included: true,
      text: "If you're building a startup.\nOr planning to start one.\nFollow this page.\nI share real startup lessons.\nThat most founders learn the hard way."
    },
    metadata: {
      hookType: "Pattern Interrupt",
      frameworkUsed: "Problem → Insight → Shift", 
      wordCount: 150,
      estimatedDuration: "1 minute",
      targetAudience: "Entrepreneurs",
      language: "English",
      tone: "Raw",
      emotionalIntensity: 3
    },
    qualityScores: {
      hookStrength: 8.5,
      retentionPotential: 8.0,
      emotionalIntensityMatch: 8.0,
      ctaAlignment: 7.5
    }
  }
};

module.exports = { HOOK_EXAMPLES, FULL_SCRIPT_EXAMPLE };
