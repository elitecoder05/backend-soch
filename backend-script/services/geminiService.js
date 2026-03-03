/**
 * Soch AI Script Generator - Gemini AI Service
 * 
 * Handles all communication with the Google Gemini API.
 * Uses the system prompt + training data to fine-tune Gemini's behavior
 * as the Soch AI script generation engine.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { SYSTEM_PROMPT } = require('../training/system-prompt');
const { HOOK_EXAMPLES, FULL_SCRIPT_EXAMPLE } = require('../training/hook-examples');
const { FRAMEWORK_EXAMPLES } = require('../training/framework-examples');

// Initialize Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Build the complete prompt with user inputs + training context
 */
const buildUserPrompt = ({
  topic,
  duration,
  customDuration,
  language,
  audience,
  customAudience,
  emotionalIntensity,
  customIntensity,
  tone,
  ctaEnabled,
  ctaType,
  customCta
}) => {
  // Resolve duration to word count guidance
  let durationGuide = '';
  let durationLabel = '';
  if (duration === '30s') {
    durationGuide = '90-120 words. Keep it tight and aggressive.';
    durationLabel = '30 seconds';
  } else if (duration === '1min') {
    durationGuide = '150-200 words. Balanced pacing.';
    durationLabel = '1 minute';
  } else if (duration === 'custom' && customDuration) {
    const minutes = parseFloat(customDuration);
    const wordCount = Math.round(minutes * 150);
    durationGuide = `Approximately ${wordCount} words (${minutes} minutes at 150 words/min).`;
    durationLabel = `${customDuration} minutes`;
  } else {
    durationGuide = '150-200 words.';
    durationLabel = '1 minute';
  }

  // Resolve audience
  const audienceLabel = audience === 'custom' ? (customAudience || 'General') : audience;

  // Resolve intensity
  let intensityLabel = '';
  switch (emotionalIntensity) {
    case 1: intensityLabel = 'Level 1 – Calm'; break;
    case 2: intensityLabel = 'Level 2 – Motivational'; break;
    case 3: intensityLabel = 'Level 3 – Strong'; break;
    case 4: intensityLabel = 'Level 4 – Aggressive'; break;
    case 5: intensityLabel = `Level 5 – Custom: ${customIntensity || 'High energy'}`; break;
    default: intensityLabel = 'Level 3 – Strong';
  }

  // CTA resolution
  let ctaInstruction = '';
  if (ctaEnabled) {
    const ctaLabel = ctaType === 'custom' ? (customCta || 'Custom CTA') : ctaType;
    ctaInstruction = `CTA: ENABLED. Type: "${ctaLabel}". Make it feel natural and aligned with the script theme.`;
  } else {
    ctaInstruction = 'CTA: DISABLED. Do NOT include any call to action.';
  }

  return `
Generate a complete video script for the following:

TOPIC: ${topic}
DURATION: ${durationLabel} (Target word count: ${durationGuide})
LANGUAGE: ${language}
AUDIENCE: ${audienceLabel}
EMOTIONAL INTENSITY: ${intensityLabel}
TONE: ${tone}
${ctaInstruction}

Remember:
- Select the most appropriate hook type based on the topic
- Select the most appropriate body framework based on content type, audience, and duration
- Match word count strictly to the duration
- The script must sound SPOKEN, not WRITTEN
- Output ONLY valid JSON as specified in your instructions
`;
};

/**
 * Build few-shot context from training examples
 */
const buildFewShotContext = () => {
  return `
Here is a complete example of an ideal script output:

INPUT:
Topic: "${FULL_SCRIPT_EXAMPLE.input.topic}"
Duration: ${FULL_SCRIPT_EXAMPLE.input.duration}
Language: ${FULL_SCRIPT_EXAMPLE.input.language}
Audience: ${FULL_SCRIPT_EXAMPLE.input.audience}
Emotional Intensity: ${FULL_SCRIPT_EXAMPLE.input.emotionalIntensity}
Tone: ${FULL_SCRIPT_EXAMPLE.input.tone}
CTA: ${FULL_SCRIPT_EXAMPLE.input.ctaEnabled ? 'Enabled' : 'Disabled'}

OUTPUT:
${JSON.stringify(FULL_SCRIPT_EXAMPLE.output, null, 2)}

Now generate a script following this exact format and quality level.
`;
};

/**
 * Generate a script using the Gemini API
 * 
 * @param {Object} params - User input parameters
 * @returns {Object} Generated script with scores
 */
const generateScript = async (params) => {
  try {
    const genAI = getGeminiClient();
    
    // Use latest Gemini Flash model
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.85,
        topP: 0.92,
        topK: 40,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });

    const userPrompt = buildUserPrompt(params);
    const fewShotContext = buildFewShotContext();
    
    const fullPrompt = `${fewShotContext}\n\n${userPrompt}`;

    console.log('[ScriptGen] Generating script for topic:', params.topic);
    console.log('[ScriptGen] Duration:', params.duration, '| Language:', params.language, '| Tone:', params.tone);

    const result = await model.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    let scriptData;
    try {
      // Try direct JSON parse
      scriptData = JSON.parse(text);
    } catch (parseError) {
      // Try to extract JSON from potential markdown wrapping
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scriptData = JSON.parse(jsonMatch[0]);
      } else {
        console.error('[ScriptGen] Failed to parse response:', text.substring(0, 200));
        throw new Error('AI response was not valid JSON. Please try again.');
      }
    }

    // Validate response structure
    if (!scriptData.hook || !scriptData.body) {
      throw new Error('AI response missing required fields (hook, body).');
    }

    // Ensure quality scores exist
    if (!scriptData.qualityScores) {
      scriptData.qualityScores = {
        hookStrength: 6.5,
        retentionPotential: 6.0,
        emotionalIntensityMatch: 6.0,
        ctaAlignment: params.ctaEnabled ? 5.0 : 0
      };
    }

    // Ensure metadata exists
    if (!scriptData.metadata) {
      scriptData.metadata = {
        hookType: scriptData.hook.type || 'Unknown',
        frameworkUsed: scriptData.body.framework || 'Unknown',
        wordCount: (scriptData.hook.text + ' ' + scriptData.body.text).split(/\s+/).length,
        estimatedDuration: params.duration,
        targetAudience: params.audience,
        language: params.language,
        tone: params.tone,
        emotionalIntensity: params.emotionalIntensity
      };
    }

    console.log('[ScriptGen] ✅ Script generated successfully. Hook type:', scriptData.hook.type);
    return scriptData;

  } catch (error) {
    // Log the FULL error for debugging
    console.error('[ScriptGen] ❌ Generation error:', error.message);
    console.error('[ScriptGen] ❌ Full error details:', JSON.stringify({
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      errorDetails: error.errorDetails,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    }, null, 2));
    
    const msg = (error.message || '').toLowerCase();
    
    if (msg.includes('api_key_invalid') || msg.includes('api key not valid')) {
      throw new Error('Gemini API key is invalid. Please check your GEMINI_API_KEY in .env file.');
    }
    if (msg.includes('api_key') && !msg.includes('invalid')) {
      throw new Error('GEMINI_API_KEY is not set in environment variables.');
    }
    if (msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('rate limit')) {
      throw new Error('Gemini API quota/rate limit exceeded. Please wait a minute or check your API key billing at https://aistudio.google.com/apikey');
    }
    if (msg.includes('429')) {
      throw new Error('Too many requests to Gemini API. Please wait 30 seconds and try again.');
    }
    if (msg.includes('safety') || msg.includes('blocked')) {
      throw new Error('Content was flagged by safety filters. Please modify your topic and try again.');
    }
    if (msg.includes('not found') || msg.includes('model')) {
      throw new Error('Gemini model not available. Raw error: ' + error.message);
    }
    
    // For any unclassified error, show the raw message
    throw new Error('Script generation failed: ' + error.message);
  }
};

module.exports = { generateScript };
