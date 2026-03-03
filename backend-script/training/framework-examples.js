/**
 * Soch AI Script Generator - Framework Training Examples
 * 
 * Examples for each of the 6 body narrative frameworks to help
 * the Gemini model understand structure and style expectations.
 */

const FRAMEWORK_EXAMPLES = {
  microStory: {
    name: "Micro Story",
    bestFor: "Reels, Shorts, personal storytelling (30-60 sec)",
    structure: ["Situation", "Tension", "Realization", "Decision"],
    example: {
      topic: "Quitting my 9-5 job",
      language: "English",
      intensity: 3,
      body: `I was sitting in a meeting. Same room. Same faces. Same pointless discussion.

And something snapped.

I looked around and realized — everyone here accepted "this is it." The promotions, the appraisals, the Friday drinks. This was their peak.

But it wasn't mine.

So I made a decision that terrified me. I quit. Not with a plan. Not with savings. Just with the belief that I deserve more than comfortable misery.`
    }
  },

  heroJourney: {
    name: "Simplified Hero's Journey",
    bestFor: "Transformation stories, longer content",
    structure: ["Ordinary life", "Discomfort/Trigger", "Conflict", "Decision", "Ongoing journey"],
    example: {
      topic: "From college dropout to entrepreneur",
      language: "Hinglish",
      intensity: 4,
      body: `Main ek average student tha. College, exams, placement — sab kuch planned tha.

Phir ek din realize hua — yeh plan mera nahi hai. Yeh toh sabka same plan hai.

Jab maine college chhoda, sab ne bola "pagal ho gaya hai." Parents disappointed. Friends confused. Society ne label laga diya — failure.

Lekin ek cheez thi jo mujhe alag karti thi — main comfortable nahi tha comfortable life mein.

Maine shuru kiya. Freelancing se. Rs 500 ke projects se. Rejections zyada the, clients kam.

Aaj bhi journey khatam nahi hui. But ab direction mera hai. Rasta mushkil hai, par galat nahi hai.`
    }
  },

  pas: {
    name: "Problem-Agitate-Solution",
    bestFor: "Business, Self-improvement, Educational",
    structure: ["Problem", "Agitation", "Shift or Solution"],
    example: {
      topic: "Why you're not growing on social media",
      language: "English",
      intensity: 3,
      body: `You've been posting consistently. Good content. Clean edits. But your views are stuck.

Here's what's killing your growth: you're creating for the algorithm, not for humans. You're optimizing thumbnails but ignoring emotions. You're following trends instead of starting conversations.

And the worst part? Every day you stay stuck, someone with half your talent but twice your clarity is passing you.

The shift is simple: stop asking "what should I post?" and start asking "what do I actually want to say?" That's where growth begins.`
    }
  },

  beforeAfterBridge: {
    name: "Before-After-Bridge",
    bestFor: "Improvement content, Habit change, Career growth",
    structure: ["Current state", "Desired state", "Bridge (how shift happens)"],
    example: {
      topic: "How waking up at 5 AM changed my life",
      language: "Hinglish",
      intensity: 2,
      body: `Pehle mera din 10 baje shuru hota tha. Late night scrolling, late morning regret. Poora din aise guzarta tha jaise koi direction hi nahi hai.

Ab mera alarm 5 AM pe bajta hai. Aur wo 2 ghante — sirf mere hote hain. No notifications. No pressure. Just me, my thoughts, and my goals.

Kya change hua? Ek simple rule — raat ko phone 10 baje band. Subah uthna automatic ho gaya. Aur ussi silence mein mujhe apni priorities samajh aayi.`
    }
  },

  openLoop: {
    name: "Open Loop Storytelling",
    bestFor: "Curiosity-driven content, suspense",
    structure: ["Incomplete situation", "Delay explanation", "Reveal later"],
    example: {
      topic: "The email that changed my career",
      language: "English",
      intensity: 3,
      body: `I received an email at 2 AM. From someone I'd never met. Subject line: "You don't know me, but I know your work."

I almost deleted it. Almost.

But something made me open it. And what I read inside made me sit up straight.

This person had been following everything I'd put out for 8 months. Every video. Every post. Every late-night rant.

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
