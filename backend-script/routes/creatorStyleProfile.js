/**
 * Creator Style Profile Routes
 * 
 * Endpoints for accessing and managing creator style profiles
 * REQUIRES AUTHENTICATION
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const { getCreatorStyleProfile } = require('../services/styleDetectionService');
const CreatorStyleProfile = require('../../models/CreatorStyleProfile');

/**
 * GET /profile
 * 
 * Get the authenticated user's creator style profile
 * REQUIRES: Authentication token
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: CreatorStyleProfile | null,
 *   status: 'initializing' | 'building' | 'established' | 'verified',
 *   message: string
 * }
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required.'
      });
    }

    const profile = await getCreatorStyleProfile(userId);

    if (!profile) {
      return res.status(200).json({
        success: true,
        data: null,
        status: 'none',
        message: 'No style profile yet. Generate at least 2 scripts to build your profile.',
        requireScripts: 5
      });
    }

    res.status(200).json({
      success: true,
      data: {
        language: profile.language,
        sentenceStructure: profile.sentenceStructure,
        tone: profile.tone,
        commonPhrases: profile.commonPhrases,
        writingPatterns: profile.writingPatterns,
        emotionalIntensity: profile.emotionalIntensity,
        preferredAudience: profile.preferredAudience,
        strictRestrictions: profile.strictRestrictions,
        totalScriptsAnalyzed: profile.totalScriptsAnalyzed,
        profileStatus: profile.profileStatus,
        lastUpdated: profile.lastUpdated,
        createdAt: profile.createdAt
      },
      status: profile.profileStatus,
      message: `Profile established from ${profile.totalScriptsAnalyzed} scripts`
    });
  } catch (error) {
    console.error('[ProfileAPI] Error fetching profile:', error.message);
    res.status(500).json({
      success: false,
      error: 'Could not fetch style profile'
    });
  }
});

/**
 * GET /profile/summary
 * 
 * Get a simplified summary of the creator's style
 * REQUIRES: Authentication token
 * 
 * Response shows the key style metrics in human-readable format
 */
router.get('/profile/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required.'
      });
    }

    const profile = await getCreatorStyleProfile(userId);

    if (!profile) {
      return res.status(200).json({
        success: true,
        summary: null,
        message: 'Generate scripts to build your style profile'
      });
    }

    // Build a human-readable summary
    const summary = {
      status: profile.profileStatus,
      scriptsAnalyzed: profile.totalScriptsAnalyzed,
      keyMetrics: {
        primaryLanguage: profile.language.primary || 'Not detected',
        languageConfidence: profile.language.confidence,
        primaryTone: profile.tone.primary || 'Not detected',
        toneConfidence: profile.tone.confidence,
        averageSentenceLength: profile.sentenceStructure.averageLength,
        sentenceComplexity: profile.sentenceStructure.complexity,
        emotionalIntensityLevel: profile.emotionalIntensity.average,
        preferredAudience: profile.preferredAudience.primary || 'General'
      },
      writingStyle: {
        usesContractions: profile.writingPatterns.usesContractions,
        casual: profile.writingPatterns.usesColloquialisms,
        formal: profile.writingPatterns.usesFormalLanguage,
        asksQuestions: profile.writingPatterns.usesQuestions,
        usesExclamation: profile.writingPatterns.abusesExclamation
      },
      signaturePhrases: profile.commonPhrases
        .slice(0, 5)
        .map(p => ({ phrase: p.phrase, frequency: p.frequency })),
      restrictions: {
        languageLocked: profile.strictRestrictions.enforceLanguageConsistency,
        toneLocked: profile.strictRestrictions.enforceOneTone,
        sentenceLengthEnforced: profile.strictRestrictions.enforceSentenceLength,
        audienceMatch: profile.strictRestrictions.enforceAudienceMatch
      }
    };

    res.status(200).json({
      success: true,
      summary,
      message: `Style profile established from ${profile.totalScriptsAnalyzed} scripts`
    });
  } catch (error) {
    console.error('[ProfileAPI] Error fetching profile summary:', error.message);
    res.status(500).json({
      success: false,
      error: 'Could not fetch style profile summary'
    });
  }
});

/**
 * PATCH /profile/restrictions
 * 
 * Update strict restrictions for style enforcement
 * REQUIRES: Authentication token
 * 
 * Body params:
 * - enforceLanguageConsistency: boolean
 * - enforceOneTone: boolean
 * - enforceSentenceLength: boolean
 * - enforceAudienceMatch: boolean
 * - enforceIntensityRange: boolean
 * - minimumCommonPhrases: number
 */
router.patch('/profile/restrictions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required.'
      });
    }

    const {
      enforceLanguageConsistency,
      enforceOneTone,
      enforceSentenceLength,
      enforceAudienceMatch,
      enforceIntensityRange,
      minimumCommonPhrases
    } = req.body;

    let profile = await CreatorStyleProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Style profile does not exist yet. Generate scripts first.'
      });
    }

    // Update restrictions
    if (enforceLanguageConsistency !== undefined) {
      profile.strictRestrictions.enforceLanguageConsistency = enforceLanguageConsistency;
    }
    if (enforceOneTone !== undefined) {
      profile.strictRestrictions.enforceOneTone = enforceOneTone;
    }
    if (enforceSentenceLength !== undefined) {
      profile.strictRestrictions.enforceSentenceLength = enforceSentenceLength;
    }
    if (enforceAudienceMatch !== undefined) {
      profile.strictRestrictions.enforceAudienceMatch = enforceAudienceMatch;
    }
    if (enforceIntensityRange !== undefined) {
      profile.strictRestrictions.enforceIntensityRange = enforceIntensityRange;
    }
    if (minimumCommonPhrases !== undefined && minimumCommonPhrases >= 0 && minimumCommonPhrases <= 10) {
      profile.strictRestrictions.minimumCommonPhrases = minimumCommonPhrases;
    }

    await profile.save();

    res.status(200).json({
      success: true,
      data: profile.strictRestrictions,
      message: 'Strict restrictions updated'
    });
  } catch (error) {
    console.error('[ProfileAPI] Error updating restrictions:', error.message);
    res.status(500).json({
      success: false,
      error: 'Could not update restrictions'
    });
  }
});

/**
 * DELETE /profile
 * 
 * Reset the creator style profile (delete and start fresh)
 * REQUIRES: Authentication token
 */
router.delete('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required.'
      });
    }

    const result = await CreatorStyleProfile.deleteOne({ userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No style profile to delete'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Style profile reset. Generate new scripts to build a fresh profile.'
    });
  } catch (error) {
    console.error('[ProfileAPI] Error deleting profile:', error.message);
    res.status(500).json({
      success: false,
      error: 'Could not delete style profile'
    });
  }
});

module.exports = router;
