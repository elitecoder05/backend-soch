require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { SYSTEM_PROMPT } = require('./backend-script/training/system-prompt');
const { FULL_SCRIPT_EXAMPLE } = require('./backend-script/training/hook-examples');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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

const fewShot = 'Example output:\n' + JSON.stringify(FULL_SCRIPT_EXAMPLE.output, null, 2);
const userPrompt = 'Generate a script for TOPIC: Why most people never escape the 9-to-5 grind, DURATION: 1 minute (150 words EXACTLY)';
const fullPrompt = fewShot + '\n\n' + userPrompt;

console.log('Sending prompt, total length:', fullPrompt.length);

model.generateContent(fullPrompt)
  .then(r => {
    const text = r.response.text();
    console.log('=== LENGTH:', text.length);
    console.log('=== FULL RESPONSE:');
    console.log(text);
    const candidate = r.response.candidates?.[0];
    console.log('=== FINISH REASON:', candidate?.finishReason);
    console.log('=== SAFETY RATINGS:', JSON.stringify(candidate?.safetyRatings));
    console.log('=== USAGE:', JSON.stringify(r.response.usageMetadata));
  })
  .catch(e => {
    console.log('=== ERROR:', e.message);
    console.log('=== STATUS:', e.status);
    console.log('=== DETAILS:', JSON.stringify(e.errorDetails));
  });
