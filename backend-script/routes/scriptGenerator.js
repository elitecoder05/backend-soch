/**
 * Soch AI Script Generator - API Routes
 * 
 * POST /api/script-generator/generate - Generate a video script
 */

const express = require('express');
const router = express.Router();
const { generateScript, regenerateSection } = require('../services/geminiService');
const { analyzeScript, updateCreatorStyleProfile, getCreatorStyleProfile } = require('../services/styleDetectionService');
const CreatorStyleProfile = require('../../models/CreatorStyleProfile');
const ScriptHistory = require('../../models/ScriptHistory');
const User = require('../../models/User');
const { authenticateTokenOptional } = require('../../middleware/auth');
require('dotenv').config();

// ─── Configuration ────────────────────────────────────────────────
const GUEST_SCRIPT_LIMIT = parseInt(process.env.GUEST_SCRIPT_LIMIT || '5');
const FREE_PLAN_SCRIPT_LIMIT = parseInt(process.env.FREE_PLAN_SCRIPT_LIMIT || '5');
const PAID_PLAN_SCRIPT_LIMIT = parseInt(process.env.PAID_PLAN_SCRIPT_LIMIT || '0'); // 0 = unlimited

// ─── Helper Functions ──────────────────────────────────────────────
/**
 * Check if monthly reset is needed for user's usage
 */
const checkAndResetMonthlyUsage = (user) => {
  const now = new Date();
  const lastReset = user.scriptGeneratorSubscription?.monthlyResetDate;
  
  if (!lastReset) return true; // First time, need reset
  
  // Check if a month has passed
  const lastResetDate = new Date(lastReset);
  const monthsPassed = (now.getFullYear() - lastResetDate.getFullYear()) * 12 + 
                       (now.getMonth() - lastResetDate.getMonth());
  
  return monthsPassed >= 1;
};

/**
 * Get the script generation limit for a user based on their plan
 */
const getScriptLimitForPlan = (planId) => {
  if (planId === 'script-free') {
    return FREE_PLAN_SCRIPT_LIMIT;
  }
  // Creator/paid plans have unlimited (0 means unlimited)
  return PAID_PLAN_SCRIPT_LIMIT;
};

/**
 * Check if user has exceeded their script generation limit
 */
const checkScriptGenerationLimit = async (userId) => {
  if (!userId) {
    // Guests are handled on frontend via localStorage
    return { canGenerate: true, limit: GUEST_SCRIPT_LIMIT, remaining: -1, isGuest: true };
  }

  try {
    const user = await User.findById(userId).lean();
    if (!user) {
      return { canGenerate: false, error: 'User not found', remaining: 0 };
    }

    const subscription = user.scriptGeneratorSubscription;
    if (!subscription) {
      return { canGenerate: false, error: 'No subscription found', remaining: 0 };
    }

    const planId = subscription.planId || 'script-free';
    const limit = getScriptLimitForPlan(planId);

    // If limit is 0, it means unlimited
    if (limit === 0) {
      return { canGenerate: true, limit: 0, remaining: -1, isUnlimited: true };
    }

    const usage = subscription.usageCount || 0;
    const remaining = Math.max(0, limit - usage);

    const canGenerate = usage < limit;
    return { 
      canGenerate, 
      limit, 
      remaining, 
      usage,
      planId,
      resetDate: subscription.monthlyResetDate
    };
  } catch (error) {
    console.error('[API] Error checking script limit:', error);
    return { canGenerate: true, limit: FREE_PLAN_SCRIPT_LIMIT, remaining: -1 };
  }
};

/**
 * Increment script generation usage count for a user
 */
const incrementScriptUsage = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const subscription = user.scriptGeneratorSubscription;
    if (!subscription) return null;

    // Reset monthly usage if needed
    if (checkAndResetMonthlyUsage(user)) {
      subscription.usageCount = 0;
      subscription.monthlyResetDate = new Date();
    }

    // Increment usage
    subscription.usageCount = (subscription.usageCount || 0) + 1;
    await user.save();

    return subscription;
  } catch (error) {
    console.error('[API] Error incrementing script usage:', error);
    return null;
  }
};

/**
 * POST /generate
 * 
 * Generates a video script based on user parameters.
 * Authentication optional (guest generation allowed)
 * 
 * Body params:
 * - topic (required): The topic/subject of the script
 * - duration: '30s' | '1min' | 'custom' (default: '1min')
 * - customDuration: number (minutes, required if duration is 'custom')
 * - language: 'English' | 'Hindi' | 'Hinglish' (default: 'English')
 * - audience: 'Students' | 'Entrepreneurs' | 'Creators' | 'custom' (default: 'Creators')
 * - customAudience: string (required if audience is 'custom')
 * - emotionalIntensity: 1-5 (default: 3)
 * - customIntensity: string (description if intensity is 5)
 * - tone: string (default: 'Inspirational')
 * - ctaEnabled: boolean (default: false)
 * - ctaType: string (e.g., 'Follow for more', 'Subscribe', 'Comment', 'Save', 'custom')
 * - customCta: string (required if ctaType is 'custom')
 * - isFollowUp: boolean (optional)
 * - followUpInstruction: string (optional, required when isFollowUp=true)
 * - previousTopic: string (optional)
 * - currentScript: object (optional, required when isFollowUp=true)
 * - sessionId: string (optional, for grouping scripts)
 */
router.post('/generate', authenticateTokenOptional, async (req, res) => {
  try {
    const userId = req.user?._id;

    const {
      topic,
      detailedInstructions,
      duration = '1min',
      customDuration,
      language = 'English',
      audience = 'Creators',
      customAudience,
      emotionalIntensity = 3,
      customIntensity,
      tone = 'Inspirational',
      ctaEnabled = false,
      ctaType = 'Follow for more',
      customCta,
      referenceUrl,
      isFollowUp = false,
      followUpInstruction,
      previousTopic,
      currentScript,
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    } = req.body;

    // Validate required field
    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required. Please provide a topic for your script.'
      });
    }

    if (topic.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Topic is too short. Please provide a more descriptive topic.'
      });
    }

    if (topic.trim().length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Topic is too long. Please keep it under 500 characters.'
      });
    }

    if (isFollowUp) {
      if (!followUpInstruction || String(followUpInstruction).trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Follow-up instruction is required in follow-up mode.'
        });
      }

      if (!currentScript || !currentScript.hook || !currentScript.body) {
        return res.status(400).json({
          success: false,
          error: 'Current script context is required for follow-up mode.'
        });
      }
    }

    // Validate duration
    const validDurations = ['30s', '1min', 'custom'];
    if (!validDurations.includes(duration)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid duration. Use "30s", "1min", or "custom".'
      });
    }

    if (duration === 'custom' && (!customDuration || isNaN(customDuration) || customDuration <= 0 || customDuration > 10)) {
      return res.status(400).json({
        success: false,
        error: 'Custom duration must be a number between 0.5 and 10 minutes.'
      });
    }

    // Validate language
    const validLanguages = ['English', 'Hindi', 'Hinglish'];
    if (!validLanguages.includes(language)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid language. Choose English, Hindi, or Hinglish.'
      });
    }

    // Validate emotional intensity
    const intensity = parseInt(emotionalIntensity);
    if (isNaN(intensity) || intensity < 1 || intensity > 5) {
      return res.status(400).json({
        success: false,
        error: 'Emotional intensity must be between 1 and 5.'
      });
    }

    // Validate tone
    const validTones = ['Inspirational', 'Dark', 'Confident', 'Vulnerable', 'Raw', 'Aggressive', 'Storytelling'];
    if (!validTones.includes(tone)) {
      return res.status(400).json({
        success: false,
        error: `Invalid tone. Choose from: ${validTones.join(', ')}.`
      });
    }

    console.log(`[API] Script generation request - User: ${userId || 'guest'} | Topic: "${topic.substring(0, 50)}..." | Duration: ${duration} | Language: ${language}`);

    // CHECK USAGE LIMIT (only for logged-in users)
    if (userId) {
      const limitCheck = await checkScriptGenerationLimit(userId);
      console.log('[API] Usage limit check:', limitCheck);
      
      if (!limitCheck.canGenerate) {
        return res.status(429).json({
          success: false,
          error: `You have reached your monthly limit of ${limitCheck.limit} script generations.`,
          limitExceeded: true,
          limit: limitCheck.limit,
          usage: limitCheck.usage,
          remaining: 0,
          resetDate: limitCheck.resetDate
        });
      }

      if (limitCheck.limit > 0 && !limitCheck.isUnlimited) {
        console.log(`[API] User ${userId} has ${limitCheck.remaining} scripts remaining (${limitCheck.usage}/${limitCheck.limit})`);
      }
    }

    // STRICT: Fetch creator's style profile (if exists)
    let creatorProfile = null;
    if (userId) {
      try {
        creatorProfile = await getCreatorStyleProfile(userId);
        if (creatorProfile) {
          console.log('[API] ✅ Creator style profile loaded, status:', creatorProfile.profileStatus);
        } else {
          console.log('[API] No existing creator style profile found');
        }
      } catch (profileError) {
        console.warn('[API] Warning: Could not fetch creator profile:', profileError.message);
        // Continue without profile - it will be created on first script
      }
    }

    // Generate the script with creator style applied
    const scriptData = await generateScript({
      topic: topic.trim(),
      detailedInstructions: detailedInstructions?.trim(),
      duration,
      customDuration,
      language,
      audience,
      customAudience,
      emotionalIntensity: intensity,
      customIntensity,
      tone,
      ctaEnabled,
      ctaType,
      customCta,
      referenceUrl,
      isFollowUp,
      followUpInstruction,
      previousTopic,
      currentScript,
      creatorProfile // Pass the creator's style profile for STRICT enforcement
    });

    console.log('[API] ✅ Script generated successfully');

    // Guests can generate scripts but do not persist history/profile updates.
    if (!userId) {
      return res.status(200).json({
        success: true,
        data: scriptData,
        metadata: {
          sessionId,
          persisted: false,
          guestMode: true,
          limit: GUEST_SCRIPT_LIMIT,
          // Guest remaining count is handled on frontend via localStorage
        }
      });
    }

    // STRICT: Analyze the generated script and update creator profile
    try {
      const scriptAnalysis = analyzeScript(scriptData, {
        language,
        tone,
        emotionalIntensity: intensity,
        audience
      });

      console.log('[API] ✅ Script analysis complete');

      // Get the next turn number for this session
      const latestTurn = await ScriptHistory.findOne({
        userId,
        sessionId,
      })
        .sort({ turnNumber: -1 })
        .select('turnNumber')
        .lean();

      const nextTurnNumber = (latestTurn?.turnNumber || 0) + 1;

      // Save to ScriptHistory with correct turn number
      const scriptHistoryRecord = new ScriptHistory({
        userId,
        topic: topic.trim(),
        sessionId,
        turnNumber: nextTurnNumber,
        userPrompt: isFollowUp ? followUpInstruction : topic,
        isFollowUp,
        params: {
          detailedInstructions: detailedInstructions?.trim(),
          duration,
          customDuration,
          language,
          audience,
          customAudience,
          emotionalIntensity: intensity,
          customIntensity,
          tone,
          ctaEnabled,
          ctaType,
          customCta,
        },
        result: scriptData
      });

      const savedHistory = await scriptHistoryRecord.save();
      console.log('[API] ✅ Script history saved:', savedHistory._id, 'Turn:', nextTurnNumber);

      // Update creator style profile with the script analysis
      const updatedProfile = await updateCreatorStyleProfile(userId, scriptAnalysis, savedHistory._id);
      console.log('[API] ✅ Creator style profile updated, new status:', updatedProfile.profileStatus);

      // Increment script usage
      const updatedSubscription = await incrementScriptUsage(userId);
      const remainingScripts = updatedSubscription?.usageCount 
        ? Math.max(0, getScriptLimitForPlan(updatedSubscription.planId) - updatedSubscription.usageCount)
        : -1;

      // Return with profile status
      res.status(200).json({
        success: true,
        data: scriptData,
        metadata: {
          historyId: savedHistory._id,
          sessionId: sessionId,
          turnNumber: nextTurnNumber,
          profileStatus: updatedProfile.profileStatus,
          totalScriptsAnalyzed: updatedProfile.totalScriptsAnalyzed,
          usage: updatedSubscription?.usageCount || 0,
          limit: getScriptLimitForPlan(updatedSubscription?.planId || 'script-free'),
          remaining: remainingScripts
        }
      });
    } catch (analysisError) {
      console.error('[API] Warning: Could not update creator profile:', analysisError.message);
      
      // Increment script usage even if profile update fails
      const updatedSubscription = await incrementScriptUsage(userId);
      const remainingScripts = updatedSubscription?.usageCount 
        ? Math.max(0, getScriptLimitForPlan(updatedSubscription.planId) - updatedSubscription.usageCount)
        : -1;

      // Return the script anyway, but without profile metadata
      res.status(200).json({
        success: true,
        data: scriptData,
        metadata: {
          warning: 'Script generated but profile update failed',
          usage: updatedSubscription?.usageCount || 0,
          limit: getScriptLimitForPlan(updatedSubscription?.planId || 'script-free'),
          remaining: remainingScripts
        }
      });
    }

  } catch (error) {
    console.error('[API] Script generation error:', error.message);
    
    const statusCode = error.message.includes('API key') ? 503 :
                       error.message.includes('rate limit') ? 429 :
                       error.message.includes('safety') ? 422 : 500;

    res.status(statusCode).json({
      success: false,
      error: error.message || 'An unexpected error occurred while generating the script.'
    });
  }
});

/**
 * POST /regenerate-section
 * 
 * Regenerates a single section (hook | body | cta) of an existing script.
 * Authentication optional (guest regeneration allowed)
 * 
 * Body params:
 * - section (required): 'hook' | 'body' | 'cta'
 * - params (required): Original generation params (topic, tone, language, etc.)
 * - currentScript (required): The full existing script result object
 * - instruction (optional): User's specific instruction for the rewrite
 */
router.post('/regenerate-section', authenticateTokenOptional, async (req, res) => {
  try {
    const userId = req.user?._id;

    const { section, params, currentScript, instruction = '' } = req.body;

    const validSections = ['hook', 'body', 'cta'];
    if (!section || !validSections.includes(section)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid section. Choose "hook", "body", or "cta".'
      });
    }

    if (!params || !params.topic) {
      return res.status(400).json({ success: false, error: 'Original params with topic are required.' });
    }

    if (!currentScript || !currentScript.hook || !currentScript.body) {
      return res.status(400).json({ success: false, error: 'currentScript with hook and body is required.' });
    }

    console.log(`[API] Regenerating section "${section}" for user ${userId}, topic: "${params.topic.substring(0, 50)}"`);

    // STRICT: Fetch creator's style profile for consistency
    let creatorProfile = null;
    if (userId) {
      try {
        creatorProfile = await getCreatorStyleProfile(userId);
      } catch (profileError) {
        console.warn('[API] Could not fetch creator profile for section regeneration:', profileError.message);
      }
    }

    // Pass creatorProfile to the regeneration function
    const sectionData = await regenerateSection(
      { ...params, creatorProfile },
      currentScript,
      section,
      instruction
    );

    console.log('[API] ✅ Section regenerated successfully');

    res.status(200).json({
      success: true,
      data: sectionData
    });

  } catch (error) {
    console.error('[API] Section regeneration error:', error.message);
    
    const statusCode = error.message.includes('rate limit') || error.message.includes('quota') ? 429 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

/**
 * GET /usage
 * 
 * Get current script generation usage for the logged-in user
 * Authentication required
 * 
 * Returns:
 * - limit: Monthly limit for the user's plan
 * - usage: Current usage this month
 * - remaining: Scripts remaining this month
 * - isUnlimited: Whether the user has unlimited scripts
 * - planId: The user's current plan
 * - resetDate: When the monthly usage resets
 */
router.get('/usage', authenticateTokenOptional, async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      // Guests don't have a usage limit tracked on the backend
      return res.status(200).json({
        success: true,
        data: {
          isGuest: true,
          limit: GUEST_SCRIPT_LIMIT,
          message: 'Guest users are tracked on frontend via localStorage'
        }
      });
    }

    const limitCheck = await checkScriptGenerationLimit(userId);
    
    if (limitCheck.error) {
      return res.status(404).json({
        success: false,
        error: limitCheck.error
      });
    }

    res.status(200).json({
      success: true,
      data: {
        limit: limitCheck.limit,
        usage: limitCheck.usage || 0,
        remaining: limitCheck.remaining,
        isUnlimited: limitCheck.isUnlimited || false,
        canGenerate: limitCheck.canGenerate,
        planId: limitCheck.planId,
        resetDate: limitCheck.resetDate
      }
    });
  } catch (error) {
    console.error('[API] Error fetching usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch usage information'
    });
  }
});

/**
 * GET /health
 * Health check for the script generator service
 * No authentication required
 */
router.get('/health', (req, res) => {
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  res.status(200).json({
    success: true,
    service: 'Soch AI Script Generator',
    geminiConfigured: hasApiKey,
    status: hasApiKey ? 'ready' : 'api_key_missing'
  });
});

module.exports = router;
