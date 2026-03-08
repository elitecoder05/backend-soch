/**
 * Script Framework Training Examples
 * 
 * Only 3 frameworks as per strict training instructions.
 * All examples follow: max 12 words per sentence, conversational tone, natural speech.
 */

const FRAMEWORK_EXAMPLES = {
  microStory: {
    name: "Micro Story",
    bestFor: "Reels, Shorts, personal stories (DEFAULT framework)",
    structure: ["Situation", "Tension", "Realization", "Decision"],
    example: {
      topic: "Quitting my 9-5 job",
      language: "English",
      intensity: 3,
      body: `I was sitting in a meeting.\nSame room.\nSame faces.\nSame pointless discussion.\n\nAnd something snapped.\n\nI looked around.\nEveryone here accepted this is it.\nThe promotions.\nThe appraisals.\nThe Friday drinks.\nThis was their peak.\n\nBut it wasn't mine.\n\nSo I made a decision.\nThat terrified me.\nI quit.\nNot with a plan.\nNot with savings.\nJust with the belief.\nThat I deserve more.\nThan comfortable misery.`
    }
  },

  problemInsightShift: {
    name: "Problem → Insight → Shift", 
    bestFor: "Creator advice, Business content, Educational videos",
    structure: ["Problem", "Why it happens", "Insight", "New perspective"],
    example: {
      topic: "Why you're not growing on social media",
      language: "English",
      intensity: 3,
      body: `You've been posting consistently.\nGood content.\nClean edits.\nBut your views are stuck.\n\nHere's what's killing your growth.\nYou're creating for the algorithm.\nNot for humans.\nYou're optimizing thumbnails.\nBut ignoring emotions.\nYou're following trends.\nInstead of starting conversations.\n\nAnd the worst part?\nEvery day you stay stuck.\nSomeone with half your talent.\nBut twice your clarity.\nIs passing you.\n\nThe shift is simple.\nStop asking what should I post.\nStart asking what do I want to say.\nThat's where growth begins.`
    }
  },

  openLoopStory: {
    name: "Open Loop Story",
    bestFor: "Mystery, Debates, Curiosity topics", 
    structure: ["Incomplete situation", "Delayed explanation", "Reveal later"],
    example: {
      topic: "The message that changed everything",
      language: "English", 
      intensity: 3,
      body: `I received a message at 2 AM.\nFrom someone I'd never met.\nSubject line said.\nYou don't know me.\nBut I know your work.\n\nI almost deleted it.\nAlmost.\n\nBut something made me open it.\nWhat I read inside.\nMade me sit up straight.\n\nThis person had been following everything.\nI'd put out for 8 months.\nEvery video.\nEvery post.\nEvery late-night rant.\n\nAnd they offered me something.\nI never expected.\nA job that would double my income.\nBut here's the twist.\nI said no.\n\nBecause that message taught me something.\nAbout the power of consistency.\nThat I never understood before.`
    }
  }
};

module.exports = { FRAMEWORK_EXAMPLES };

And they had one question: "Why are you still playing small?"

That one line hit harder than any motivational speaker ever could. Because it came from a stranger who saw what I was too afraid to admit.

That night, I made the biggest decision of my career.`
    }
  },

  dataStoryHybrid: {
    name: "Data + Story Hybrid",
    bestFor: "Credibility content, Entrepreneurship, Creator advice",
    structure: ["Real situation", "Insert statistic/fact", "Connect to personal meaning"],
    example: {
      topic: "Why most creators give up in 6 months",
      language: "Hinglish",
      intensity: 3,
      body: `Stats kehte hain — 90% creators 6 months mein quit kar dete hain. Sirf 10% first year cross karte hain.

Main bhi almost quit karne wala tha. 4 months mein — 12 videos, 200 views per video, zero sponsors.

Lekin ek cheez samajh aayi: log content ki quality dekh ke nahi rukte. Wo consistency dekhte hain. Trust build hota hai repetition se, not perfection se.

Aur jab maine 6-month mark cross kiya — audience growth exponential ho gayi. Kyunki ab logo ko laga: "Yeh banda serious hai."

Data support karta hai: creators who post 100+ videos have 10x more growth than those who post 30. The game isn't talent. It's endurance.`
    }
  }
};

module.exports = { FRAMEWORK_EXAMPLES };
