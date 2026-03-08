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
  customCta,
  referenceUrl
}) => {
  // STRICT word count control as per training instructions
  let durationGuide = '';
  let durationLabel = '';
  
  if (duration === '30s') {
    durationGuide = '90 words EXACTLY';
    durationLabel = '30 seconds';
  } else if (duration === '1min') {
    durationGuide = '150 words EXACTLY';
    durationLabel = '1 minute';
  } else if (duration === 'custom' && customDuration) {
    const minutes = parseFloat(customDuration);
    const wordCount = Math.round(minutes * 150); // 150 words per minute
    durationGuide = `${wordCount} words EXACTLY (${minutes} minutes)`;
    durationLabel = `${customDuration} minutes`;
  } else {
    durationGuide = '150 words EXACTLY';
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

  // Reference URL handling as per training instructions
  let referenceInstruction = '';
  if (referenceUrl) {
    referenceInstruction = `

REFERENCE STYLE REPLICATION:
User provided this reference: ${referenceUrl}

FOLLOW THESE STEPS:
1. Identify the structure of this reference (hook type, narrative flow, sentence length, pacing) 
2. Replicate the STRUCTURE but change the topic completely
3. NEVER copy sentences from the reference
4. ONLY copy: pacing, storytelling rhythm, hook pattern, sentence structure

Your script must have the same STYLE and STRUCTURE as the reference but different content.`;
  }

  return `
Generate a script for:

TOPIC: ${topic}
DURATION: ${durationLabel} (Word count: ${durationGuide})
LANGUAGE: ${language}
AUDIENCE: ${audienceLabel}
EMOTIONAL INTENSITY: ${intensityLabel}
TONE: ${tone}
${ctaInstruction}${referenceInstruction}

STRICT REQUIREMENTS:
- Apply natural speech filter: sentences max 12 words each
- Write like talking to a friend, not writing an essay
- Use only 3 narrative frameworks: Micro Story, Problem→Insight→Shift, Open Loop Story
- Hook: Maximum 12 words, maximum 2 lines, must sound like spoken language
- Match word count EXACTLY to duration requirement
- Never use prohibited words (AI, psychological hooks, algorithm, etc.)
- Output ONLY valid JSON as specified

Remember: This script will be SPOKEN, not READ. Make it conversational and natural.`;
};
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

/**
 * Regenerate a single section (hook | body | cta) of an existing script.
 *
 * @param {Object} params - Original generation params
 * @param {Object} currentScript - The full existing script result
 * @param {'hook'|'body'|'cta'} section - Which section to regenerate
 * @param {string} [instruction] - Optional user instruction for the rewrite
 */
const regenerateSection = async (params, currentScript, section, instruction = '') => {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.9,  // slightly higher for variety
        topP: 0.92,
        topK: 40,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    });

    const audienceLabel = params.audience === 'custom' ? (params.customAudience || 'General') : params.audience;
    const ctaLabel = params.ctaType === 'custom' ? (params.customCta || 'Custom CTA') : params.ctaType;

    const existingScript = `
Hook: ${currentScript.hook.text}
Body: ${currentScript.body.text}
CTA: ${currentScript.cta.included ? currentScript.cta.text : '(none)'}
`.trim();

    let sectionPrompt = '';
    if (section === 'hook') {
      sectionPrompt = `Rewrite ONLY the HOOK for this script. Keep the same topic, tone, and audience.
${instruction ? `SPECIFIC INSTRUCTION: ${instruction}` : 'Make the hook fresh and different from the current one.'}

Return JSON with ONLY this structure:
{ "hook": { "type": "<hook type>", "text": "<new hook text>" } }`;
    } else if (section === 'body') {
      sectionPrompt = `Rewrite ONLY the BODY of this script. Keep the same topic, tone, and audience.
${instruction ? `SPECIFIC INSTRUCTION: ${instruction}` : 'Use a different storytelling framework for variety.'}

Return JSON with ONLY this structure:
{ "body": { "framework": "<framework name>", "text": "<new body text>" } }`;
    } else if (section === 'cta') {
      const ctaInstruction = params.ctaEnabled
        ? `CTA type: "${ctaLabel}". Write a natural CTA.`
        : 'CTA is disabled. Return cta.included = false and cta.text = "".';
      sectionPrompt = `Rewrite ONLY the CTA for this script. ${ctaInstruction}
${instruction ? `SPECIFIC INSTRUCTION: ${instruction}` : ''}

Return JSON with ONLY this structure:
{ "cta": { "included": <bool>, "text": "<cta text or empty string>" } }`;
    }

    const fullPrompt = `
ORIGINAL TOPIC: ${params.topic}
TONE: ${params.tone}
LANGUAGE: ${params.language}
AUDIENCE: ${audienceLabel}
EMOTIONAL INTENSITY: ${params.emotionalIntensity}

CURRENT SCRIPT:
${existingScript}

TASK: ${sectionPrompt}
`;

    console.log(`[ScriptGen] Regenerating section: ${section} for topic: ${params.topic}`);
    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    let sectionData;
    try {
      sectionData = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) sectionData = JSON.parse(match[0]);
      else throw new Error('AI response was not valid JSON.');
    }

    console.log(`[ScriptGen] ✅ Section "${section}" regenerated.`);
    return sectionData;

  } catch (error) {
    console.error(`[ScriptGen] ❌ Section regeneration error (${section}):`, error.message);
    throw new Error('Section regeneration failed: ' + error.message);
  }
};

module.exports = { generateScript, regenerateSection };
