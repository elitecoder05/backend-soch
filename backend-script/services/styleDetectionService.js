/**
 * STRICT Style Detection Service
 * 
 * Analyzes user scripts to detect:
 * 1. Language preferences (English/Hindi/Hinglish)
 * 2. Sentence structure and complexity
 * 3. Tone and writing characteristics
 * 4. Common phrases and patterns
 * 5. Emotional intensity patterns
 * 
 * STRICT ENFORCEMENT: All detections have confidence thresholds
 */

const CreatorStyleProfile = require('../models/CreatorStyleProfile');
const ScriptHistory = require('../models/ScriptHistory');

/**
 * STRICT Language Detection
 * Analyzes text to determine language: English, Hindi, or Hinglish
 */
const detectLanguage = (text) => {
  if (!text || text.trim().length === 0) {
    return { language: null, confidence: 0 };
  }

  // Regex patterns for language detection
  const devanagariRegex = /[\u0900-\u097F]/g; // Hindi/Devanagari
  const englishRegex = /[a-zA-Z]/g;
  const hinglishCommonPatterns = /\b(ki|hai|ke|me|par|tha|the|wo|ye|vo|haan|nahi|really|toh|matlab)\b/gi;

  const devanagariMatches = (text.match(devanagariRegex) || []).length;
  const englishMatches = (text.match(englishRegex) || []).length;
  const hinglishMatches = (text.match(hinglishCommonPatterns) || []).length;

  const totalCharacters = text.length;
  const devanagariPercentage = (devanagariMatches / totalCharacters) * 100;
  const englishPercentage = (englishMatches / totalCharacters) * 100;

  // STRICT classification rules
  if (devanagariPercentage > 50) {
    return { language: 'Hindi', confidence: Math.min(devanagariPercentage / 100, 1) };
  }

  if (englishPercentage > 50 && hinglishMatches > 5) {
    return { language: 'Hinglish', confidence: 0.85 };
  }

  if (englishPercentage > 70) {
    return { language: 'English', confidence: Math.min(englishPercentage / 100, 1) };
  }

  return { language: null, confidence: 0 };
};

/**
 * STRICT Sentence Analysis
 * Analyzes sentence length, structure, and patterns
 */
const analyzeSentenceStructure = (text) => {
  if (!text || text.trim().length === 0) {
    return {
      averageLength: 0,
      minLength: 0,
      maxLength: 0,
      complexity: 'Simple',
      preferredPatterns: [],
    };
  }

  // Split into sentences (strict rules)
  const sentenceRegex = /[.!?]+/g;
  const sentences = text.split(sentenceRegex).filter((s) => s.trim().length > 0);

  if (sentences.length === 0) {
    return {
      averageLength: 0,
      minLength: 0,
      maxLength: 0,
      complexity: 'Simple',
      preferredPatterns: [],
    };
  }

  const wordCounts = sentences.map((s) =>
    s
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0).length
  );

  const averageLength = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  const minLength = Math.min(...wordCounts);
  const maxLength = Math.max(...wordCounts);

  // Determine complexity based on average sentence length
  let complexity = 'Simple';
  if (averageLength > 20) {
    complexity = 'Complex';
  } else if (averageLength > 10) {
    complexity = 'Moderate';
  }

  // Detect sentence patterns
  const preferredPatterns = [];

  // Pattern detection (Question-Answer, Short-Punch, Long-Build)
  let questionCount = 0;
  let shortSentenceCount = 0;
  let longSentenceCount = 0;

  wordCounts.forEach((count) => {
    if (count < 5) shortSentenceCount++;
    if (count > 20) longSentenceCount++;
  });

  const questionMatches = (text.match(/\?/g) || []).length;
  questionCount = questionMatches;

  if (questionCount / sentences.length > 0.3) {
    preferredPatterns.push({ pattern: 'Question-Answer', frequency: 0.8 });
  }

  if (shortSentenceCount / sentences.length > 0.4) {
    preferredPatterns.push({ pattern: 'Short-Punch', frequency: 0.75 });
  }

  if (longSentenceCount / sentences.length > 0.3) {
    preferredPatterns.push({ pattern: 'Long-Build', frequency: 0.7 });
  }

  return {
    averageLength: parseFloat(averageLength.toFixed(2)),
    minLength,
    maxLength,
    complexity,
    preferredPatterns,
  };
};

/**
 * STRICT Tone Detection
 * Analyzes emotional tone and writing characteristics
 */
const detectTone = (text) => {
  if (!text || text.trim().length === 0) {
    return { primary: null, secondary: [], confidence: 0, characteristics: {} };
  }

  const characteristics = {
    formal: 0,
    casual: 0,
    humorous: 0,
    emotional: 0,
    direct: 0,
  };

  // Formal indicators
  const formalPatterns = /\b(therefore|moreover|furthermore|thus|however|whilst|accordingly|consequently)\b/gi;
  characteristics.formal = (text.match(formalPatterns) || []).length;

  // Casual indicators
  const casualPatterns = /\b(gonna|wanna|kinda|sorta|yeah|hey|man|dude|bro|yo)\b/gi;
  characteristics.casual = (text.match(casualPatterns) || []).length;

  // Humorous indicators
  const humorPatterns = /[😂😜🤣😄😆]|lol|haha|joke|funny|hilarious/gi;
  characteristics.humorous = (text.match(humorPatterns) || []).length;

  // Emotional indicators
  const emotionalPatterns = /\b(love|hate|adore|despise|incredible|amazing|terrible|awful|beautiful|horrible|feel|felt|emotion)\b/gi;
  characteristics.emotional = (text.match(emotionalPatterns) || []).length;

  // Direct indicators
  const directPatterns = /\b(must|need|should|required|essential|critical|important|key|crucial)\b/gi;
  characteristics.direct = (text.match(directPatterns) || []).length;

  // Normalize by text length
  const wordCount = text.split(/\s+/).length;
  Object.keys(characteristics).forEach((key) => {
    characteristics[key] = parseFloat(
      (characteristics[key] / wordCount).toFixed(3)
    );
  });

  // Tone detection logic (STRICT)
  let primary = null;
  let confidence = 0;

  if (characteristics.emotional > 0.05 && characteristics.casual > 0.02) {
    primary = 'Vulnerable';
    confidence = Math.min(characteristics.emotional * 2, 1);
  } else if (characteristics.direct > 0.05) {
    primary = 'Aggressive';
    confidence = characteristics.direct;
  } else if (characteristics.formal > 0.03) {
    primary = 'Confident';
    confidence = characteristics.formal;
  } else if (characteristics.casual > 0.04) {
    primary = 'Raw';
    confidence = characteristics.casual;
  } else if (characteristics.humorous > 0.02) {
    primary = 'Storytelling';
    confidence = characteristics.humorous;
  } else {
    primary = 'Inspirational';
    confidence = 0.7;
  }

  return {
    primary,
    secondary: [],
    confidence: parseFloat(confidence.toFixed(2)),
    characteristics,
  };
};

/**
 * STRICT Common Phrase Detection
 * Extracts recurring phrases (STRICT minimum length)
 */
const extractCommonPhrases = (text) => {
  if (!text || text.trim().length < 20) {
    return [];
  }

  // Extract 2-4 word phrases (STRICT rules)
  const phrases = [];
  const words = text.toLowerCase().split(/\s+/);

  // Extract bigrams, trigrams, and 4-grams
  for (let i = 0; i < words.length - 1; i++) {
    for (let length = 2; length <= 4 && i + length <= words.length; length++) {
      const phrase = words.slice(i, i + length).join(' ');
      // STRICT: Only include clean phrases, no punctuation heavy ones
      if (!/^[a-z\s]+$/.test(phrase)) continue;
      if (phrase.split(' ').some((w) => w.length < 2)) continue; // Min 2 chars per word

      const existing = phrases.find((p) => p.phrase === phrase);
      if (existing) {
        existing.frequency++;
      } else {
        phrases.push({ phrase, frequency: 1 });
      }
    }
  }

  // STRICT: Only include phrases that appear at least 2 times
  return phrases
    .filter((p) => p.frequency >= 2)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10) // Top 10 phrases
    .map((p) => ({
      phrase: p.phrase,
      frequency: p.frequency,
      category: 'Custom', // Will be categorized later
    }));
};

/**
 * STRICT Writing Pattern Detection
 */
const detectWritingPatterns = (text) => {
  if (!text || text.trim().length === 0) {
    return {
      usesContractions: false,
      usesColloquialisms: false,
      usesFormalLanguage: false,
      favoursActiveVoice: false,
      abusesExclamation: false,
      usesCaps: false,
      usesEllipsis: false,
      usesQuestions: false,
      averageWordLength: 0,
    };
  }

  const contractionRegex = /\b(don't|can't|won't|isn't|aren't|wasn't|weren't|haven't|hasn't|hadn't|doesn't|didn't|shouldn't|wouldn't|couldn't|mightn't|shan't|mustn't)\b/gi;
  const colloquialismRegex = /\b(gonna|wanna|gotta|kinda|sorta|ain't|y'all|yup|nope|yeah|yep|nah)\b/gi;
  const exclamationRegex = /!/g;
  const capsRegex = /[A-Z]{2,}/g;
  const ellipsisRegex = /\.\.\./g;
  const questionRegex = /\?/g;

  const words = text.split(/\s+/);
  const wordLengths = words.map((w) => w.replace(/[^a-zA-Z]/g, '').length).filter((l) => l > 0);
  const averageWordLength = wordLengths.length > 0 ? (wordLengths.reduce((a, b) => a + b, 0) / wordLengths.length).toFixed(2) : 0;

  const charCount = text.length;
  const exclamationCount = (text.match(exclamationRegex) || []).length;
  const capsCount = (text.match(capsRegex) || []).length;

  return {
    usesContractions: (text.match(contractionRegex) || []).length > text.split(/\s+/).length * 0.02,
    usesColloquialisms: (text.match(colloquialismRegex) || []).length > 0,
    usesFormalLanguage: /\b(therefore|furthermore|thus|moreover)\b/gi.test(text),
    favoursActiveVoice: true, // Default assumption (hard to detect perfectly)
    abusesExclamation: exclamationCount > charCount * 0.01,
    usesCaps: capsCount > 0,
    usesEllipsis: (text.match(ellipsisRegex) || []).length > 0,
    usesQuestions: (text.match(questionRegex) || []).length > words.length * 0.05,
    averageWordLength: parseFloat(averageWordLength),
  };
};

/**
 * STRICT Emotional Intensity Detection
 */
const detectEmotionalIntensity = (text) => {
  if (!text || text.trim().length === 0) {
    return { average: 3, range: { min: 3, max: 3 }, distribution: {} };
  }

  // Intensity indicators (STRICT)
  const level1Patterns = /\b(calm|peaceful|serene|quiet|gentle)\b/gi;
  const level2Patterns = /\b(good|nice|great|wonderful|positive|motivated|encourage|inspire)\b/gi;
  const level3Patterns = /\b(strong|powerful|significant|important|critical)\b/gi;
  const level4Patterns = /\b(intense|extreme|aggressive|fight|battle|rage|furious)\b/gi;
  const level5Patterns = /\b(devastating|catastrophic|revolutionary|life-changing|explosive)\b/gi;

  const counts = {
    '1': (text.match(level1Patterns) || []).length,
    '2': (text.match(level2Patterns) || []).length,
    '3': (text.match(level3Patterns) || []).length,
    '4': (text.match(level4Patterns) || []).length,
    '5': (text.match(level5Patterns) || []).length,
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const average = total === 0 ? 3 : Math.round(
    (1 * counts['1'] + 2 * counts['2'] + 3 * counts['3'] + 4 * counts['4'] + 5 * counts['5']) / total
  );

  return {
    average: Math.max(1, Math.min(5, average)),
    range: { min: Math.max(1, average - 1), max: Math.min(5, average + 1) },
    distribution: counts,
  };
};

/**
 * MAIN: Analyze Complete Script
 * This is the entry point that performs full analysis
 */
const analyzeScript = (scriptResult, params) => {
  if (!scriptResult || !params) {
    throw new Error('scriptResult and params are required');
  }

  // Combine hook + body for analysis (STRICT approach)
  const fullText = `${scriptResult.hook?.text || ''} ${scriptResult.body?.text || ''}`.trim();

  if (fullText.length === 0) {
    throw new Error('No text content to analyze');
  }

  return {
    language: detectLanguage(fullText),
    sentenceStructure: analyzeSentenceStructure(fullText),
    tone: detectTone(fullText),
    commonPhrases: extractCommonPhrases(fullText),
    writingPatterns: detectWritingPatterns(fullText),
    emotionalIntensity: detectEmotionalIntensity(fullText),
    // STRICT: Also capture the actual parameters used
    paramsUsed: {
      language: params.language,
      tone: params.tone,
      emotionalIntensity: params.emotionalIntensity,
      audience: params.audience,
    },
  };
};

/**
 * UPDATE User Style Profile (STRICT merge logic)
 */
const updateCreatorStyleProfile = async (userId, scriptAnalysis, scriptHistoryId) => {
  try {
    let profile = await CreatorStyleProfile.findOne({ userId });

    if (!profile) {
      // Create new profile
      profile = new CreatorStyleProfile({
        userId,
        language: {
          primary: scriptAnalysis.language.language,
          confidence: scriptAnalysis.language.confidence,
          distribution: {
            [scriptAnalysis.language.language]: 1,
          },
          samplesAnalyzed: 1,
        },
      });
    }

    // STRICT: Update language (NEVER mix unless creator does)
    if (scriptAnalysis.language.confidence > 0.7) {
      if (!profile.language.primary) {
        profile.language.primary = scriptAnalysis.language.language;
        profile.language.confidence = scriptAnalysis.language.confidence;
      } else if (profile.language.primary === scriptAnalysis.language.language) {
        // Reinforce confidence
        profile.language.confidence = (profile.language.confidence + scriptAnalysis.language.confidence) / 2;
      }
    }

    // Update distribution
    const lang = scriptAnalysis.language.language;
    if (lang && profile.language.distribution[lang] !== undefined) {
      profile.language.distribution[lang]++;
    }
    profile.language.samplesAnalyzed++;

    // STRICT: Update sentence structure (rolling average)
    if (scriptAnalysis.sentenceStructure.averageLength > 0) {
      const oldAvg = profile.sentenceStructure.averageLength;
      const newAvg = (oldAvg + scriptAnalysis.sentenceStructure.averageLength) / 2;
      profile.sentenceStructure.averageLength = parseFloat(newAvg.toFixed(2));
      profile.sentenceStructure.minLength = Math.min(
        profile.sentenceStructure.minLength || 999,
        scriptAnalysis.sentenceStructure.minLength
      );
      profile.sentenceStructure.maxLength = Math.max(
        profile.sentenceStructure.maxLength || 0,
        scriptAnalysis.sentenceStructure.maxLength
      );
      profile.sentenceStructure.complexity = scriptAnalysis.sentenceStructure.complexity;
      profile.sentenceStructure.preferredPatterns = scriptAnalysis.sentenceStructure.preferredPatterns;
    }

    // STRICT: Update tone (confidence-weighted)
    if (scriptAnalysis.tone.confidence > 0.5) {
      if (!profile.tone.primary) {
        profile.tone.primary = scriptAnalysis.tone.primary;
        profile.tone.confidence = scriptAnalysis.tone.confidence;
      } else {
        // Reinforce existing tone if it matches
        if (profile.tone.primary === scriptAnalysis.tone.primary) {
          profile.tone.confidence = (profile.tone.confidence + scriptAnalysis.tone.confidence) / 2;
        }
      }
    }

    // Update tone characteristics
    Object.keys(scriptAnalysis.tone.characteristics).forEach((key) => {
      const oldVal = profile.tone.characteristics[key] || 0;
      profile.tone.characteristics[key] = (oldVal + scriptAnalysis.tone.characteristics[key]) / 2;
    });

    // STRICT: Add common phrases (deduplicate)
    scriptAnalysis.commonPhrases.forEach((newPhrase) => {
      const existing = profile.commonPhrases.find((p) => p.phrase === newPhrase.phrase);
      if (existing) {
        existing.frequency++;
      } else if (profile.commonPhrases.length < 15) {
        profile.commonPhrases.push({
          phrase: newPhrase.phrase,
          frequency: 1,
          category: 'Custom',
        });
      }
    });

    // Sort and keep top 15
    profile.commonPhrases.sort((a, b) => b.frequency - a.frequency);
    profile.commonPhrases = profile.commonPhrases.slice(0, 15);

    // STRICT: Update writing patterns
    Object.keys(scriptAnalysis.writingPatterns).forEach((key) => {
      profile.writingPatterns[key] = scriptAnalysis.writingPatterns[key];
    });

    // STRICT: Update emotional intensity
    const oldIntensity = profile.emotionalIntensity.average || 3;
    profile.emotionalIntensity.average = Math.round(
      (oldIntensity + scriptAnalysis.emotionalIntensity.average) / 2
    );
    profile.emotionalIntensity.range = scriptAnalysis.emotionalIntensity.range;

    // Update intensity distribution
    Object.keys(scriptAnalysis.emotionalIntensity.distribution).forEach((level) => {
      profile.emotionalIntensity.distribution[level]++;
    });

    // Update metadata
    profile.totalScriptsAnalyzed++;
    profile.lastUpdated = new Date();
    profile.lastUpdatedScriptId = scriptHistoryId;

    // STRICT: Update profile status based on samples
    if (profile.totalScriptsAnalyzed >= 5 && profile.language.primary && profile.tone.primary) {
      profile.profileStatus = 'established';
    } else if (profile.totalScriptsAnalyzed >= 2) {
      profile.profileStatus = 'building';
    }

    await profile.save();
    return profile;
  } catch (error) {
    console.error('Error updating creator style profile:', error);
    throw error;
  }
};

/**
 * GET User Style Profile with defaults
 */
const getCreatorStyleProfile = async (userId) => {
  try {
    let profile = await CreatorStyleProfile.findOne({ userId });

    if (!profile) {
      // Return empty profile structure
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Error getting creator style profile:', error);
    throw error;
  }
};

module.exports = {
  analyzeScript,
  updateCreatorStyleProfile,
  getCreatorStyleProfile,
  detectLanguage,
  analyzeSentenceStructure,
  detectTone,
  extractCommonPhrases,
  detectWritingPatterns,
  detectEmotionalIntensity,
};
