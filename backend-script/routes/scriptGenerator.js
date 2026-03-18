/**
 * Soch AI Script Generator - API Routes
 * 
 * POST /api/script-generator/generate - Generate a video script
 */

const express = require('express');
const router = express.Router();
const { generateScript, regenerateSection } = require('../services/geminiService');

/**
 * POST /generate
 * 
 * Generates a video script based on user parameters.
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
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      topic,
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

    console.log(`[API] Script generation request - Topic: "${topic.substring(0, 50)}..." | Duration: ${duration} | Language: ${language}`);

    // Generate the script
    const scriptData = await generateScript({
      topic: topic.trim(),
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
    });

    res.status(200).json({
      success: true,
      data: scriptData
    });

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
 * 
 * Body params:
 * - section (required): 'hook' | 'body' | 'cta'
 * - params (required): Original generation params (topic, tone, language, etc.)
 * - currentScript (required): The full existing script result object
 * - instruction (optional): User's specific instruction for the rewrite
 */
router.post('/regenerate-section', async (req, res) => {
  try {
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

    console.log(`[API] Regenerating section "${section}" for topic: "${params.topic.substring(0, 50)}"`);

    const sectionData = await regenerateSection(params, currentScript, section, instruction);

    res.status(200).json({ success: true, data: sectionData });

  } catch (error) {
    console.error('[API] Section regeneration error:', error.message);
    
    const statusCode = error.message.includes('rate limit') || error.message.includes('quota') ? 429 : 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

/**
 * GET /health
 * Health check for the script generator service
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
