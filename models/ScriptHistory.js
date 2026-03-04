const mongoose = require('mongoose');

const scriptHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  topic: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },
  params: {
    duration: String,
    customDuration: Number,
    language: String,
    audience: String,
    customAudience: String,
    emotionalIntensity: Number,
    customIntensity: String,
    tone: String,
    ctaEnabled: Boolean,
    ctaType: String,
    customCta: String,
  },
  result: {
    hook: {
      type: { type: String },
      text: String,
    },
    body: {
      framework: String,
      text: String,
    },
    cta: {
      included: Boolean,
      text: String,
    },
    metadata: {
      hookType: String,
      frameworkUsed: String,
      wordCount: Number,
      estimatedDuration: String,
      targetAudience: String,
      language: String,
      tone: String,
      emotionalIntensity: Number,
    },
    qualityScores: {
      hookStrength: Number,
      retentionPotential: Number,
      emotionalIntensityMatch: Number,
      ctaAlignment: Number,
    },
  },
}, {
  timestamps: true,
});

// Compound index for efficient user-specific queries sorted by date
scriptHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ScriptHistory', scriptHistorySchema);
