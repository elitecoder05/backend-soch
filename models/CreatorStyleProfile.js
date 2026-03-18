const mongoose = require('mongoose');

const creatorStyleProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  /**
   * LANGUAGE PREFERENCES - Strict detection
   * Tracks which language the creator primarily uses
   */
  language: {
    primary: {
      type: String,
      enum: ['English', 'Hindi', 'Hinglish'],
      default: null,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0, // 0.0 to 1.0 confidence score
    },
    distribution: {
      English: { type: Number, default: 0 },
      Hindi: { type: Number, default: 0 },
      Hinglish: { type: Number, default: 0 },
    },
    samplesAnalyzed: {
      type: Number,
      default: 0,
    },
  },

  /**
   * SENTENCE STRUCTURE - Strict metrics
   * Analyzes sentence length, complexity, and patterns
   */
  sentenceStructure: {
    averageLength: {
      type: Number,
      default: 0, // Average words per sentence
    },
    minLength: {
      type: Number,
      default: 0, // Shortest sentence in words
    },
    maxLength: {
      type: Number,
      default: 0, // Longest sentence in words
    },
    complexity: {
      type: String,
      enum: ['Simple', 'Moderate', 'Complex'],
      default: null,
    },
    preferredPatterns: [{
      pattern: String, // e.g., "Question-Answer", "Short-Punch", "Long-Build"
      frequency: Number, // How often this pattern appears (0.0-1.0)
    }],
  },

  /**
   * TONE PREFERENCES - Strict categorization
   * Detects and stores the creator's dominant tone
   */
  tone: {
    primary: {
      type: String,
      enum: ['Inspirational', 'Dark', 'Confident', 'Vulnerable', 'Raw', 'Aggressive', 'Storytelling', 'Custom'],
      default: null,
    },
    secondary: [{
      type: String,
      enum: ['Inspirational', 'Dark', 'Confident', 'Vulnerable', 'Raw', 'Aggressive', 'Storytelling', 'Custom'],
    }],
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    characteristics: {
      formal: { type: Number, default: 0 }, // 0-1 scale
      casual: { type: Number, default: 0 },
      humorous: { type: Number, default: 0 },
      emotional: { type: Number, default: 0 },
      direct: { type: Number, default: 0 },
    },
  },

  /**
   * COMMON PHRASES - Strict phrase tracking
   * Identifies and stores frequently used phrases
   */
  commonPhrases: [{
    phrase: {
      type: String,
      required: true,
      maxlength: 200,
    },
    frequency: {
      type: Number,
      default: 1,
    },
    category: {
      type: String,
      enum: ['Hook', 'Body', 'CTA', 'Transition', 'Custom'],
      default: 'Custom',
    },
    contextExample: String,
  }],

  /**
   * WRITING PATTERNS - Strict pattern detection
   */
  writingPatterns: {
    usesContractions: {
      type: Boolean,
      default: false, // "don't", "can't", etc.
    },
    usesColloquialisms: {
      type: Boolean,
      default: false, // Informal language
    },
    usesFormalLanguage: {
      type: Boolean,
      default: false,
    },
    favoursActiveVoice: {
      type: Boolean,
      default: true,
    },
    abusesExclamation: {
      type: Boolean,
      default: false, // Uses ! frequently
    },
    usesCaps: {
      type: Boolean,
      default: false, // Uses ALL CAPS
    },
    usesEllipsis: {
      type: Boolean,
      default: false, // Uses ...
    },
    usesQuestions: {
      type: Boolean,
      default: false, // Rhetorical questions
    },
    averageWordLength: {
      type: Number,
      default: 0, // Characters per word
    },
  },

  /**
   * AUDIENCE PREFERENCE - Strict detection
   */
  preferredAudience: {
    primary: {
      type: String,
      enum: ['Students', 'Entrepreneurs', 'Creators', 'Custom'],
      default: null,
    },
    secondary: [(String)],
    customDescriptions: [String],
  },

  /**
   * EMOTIONAL INTENSITY - Strict profile
   */
  emotionalIntensity: {
    average: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    range: {
      min: { type: Number, min: 1, max: 5 },
      max: { type: Number, min: 1, max: 5 },
    },
    distribution: {
      '1': { type: Number, default: 0 }, // Calm
      '2': { type: Number, default: 0 }, // Motivational
      '3': { type: Number, default: 0 }, // Strong
      '4': { type: Number, default: 0 }, // Aggressive
      '5': { type: Number, default: 0 }, // Custom/Custom
    },
  },

  /**
   * STRICT RESTRICTIONS - Hard constraints
   * These are the strict rules that must be enforced
   */
  strictRestrictions: {
    // NEVER deviate from detected language
    enforceLanguageConsistency: {
      type: Boolean,
      default: true,
    },
    // NEVER mix languages if creator doesn't
    allowLanguageMixing: {
      type: Boolean,
      default: false,
    },
    // Enforce sentence length min/max
    enforceSentenceLength: {
      type: Boolean,
      default: true,
    },
    sentenceLengthConstraint: {
      minWords: { type: Number, default: 3 },
      maxWords: { type: Number, default: 50 },
    },
    // ONLY use detected tone
    enforceOneTone: {
      type: Boolean,
      default: true,
    },
    // Require at least 2 common phrases per script
    minimumCommonPhrases: {
      type: Number,
      default: 2,
    },
    // MUST match primary audience
    enforceAudienceMatch: {
      type: Boolean,
      default: true,
    },
    // Emotional intensity must be within detected range
    enforceIntensityRange: {
      type: Boolean,
      default: true,
    },
  },

  /**
   * METADATA
   */
  totalScriptsAnalyzed: {
    type: Number,
    default: 0,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  lastUpdatedScriptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScriptHistory',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  profileStatus: {
    type: String,
    enum: ['initializing', 'building', 'established', 'verified'],
    default: 'initializing',
  },
  requiredScriptsForEstablished: {
    type: Number,
    default: 5, // Needs 5 scripts to be "established"
  },
}, {
  timestamps: true,
});

// Index for quick access
creatorStyleProfileSchema.index({ userId: 1 });
creatorStyleProfileSchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('CreatorStyleProfile', creatorStyleProfileSchema);
