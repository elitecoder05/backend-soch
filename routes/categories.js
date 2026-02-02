const express = require('express');
const Model = require('../models/Model');

const router = express.Router();

// Category alias mapping for backward compatibility
const CATEGORY_ALIASES = {
  'image-to-image': ['image-to-image', 'image'],
  'code-ai': ['code-ai', 'code'],
  'video-generation': ['video-generation', 'video'],
  'audio-editing': ['audio-editing', 'audio'],
  'copywriting': ['copywriting', 'marketing'],
  'chatbots': ['chatbots']
};

// Static categories list (this mirrors backend validation list)
const CATEGORIES = [
  // Existing categories
  { slug: 'image-to-image', name: 'Image to Image Generation', description: 'AI models for image-to-image conversion and transformation', icon: 'Image' },
  { slug: 'code-ai', name: 'Code to AI Assistant', description: 'Code generation and AI-powered code assistants', icon: 'Code' },
  { slug: 'voice-cloning', name: 'Voice to Voice Cloning', description: 'Voice synthesis and cloning models', icon: 'Mic' },
  { slug: 'writing', name: 'Writing & Web', description: 'Writing assistance and web content creation tools', icon: 'BookOpen' },
  { slug: 'research', name: 'SEO Research & Science', description: 'Research, analytics, and scientific models', icon: 'Zap' },
  { slug: 'video-generation', name: 'Video Generation', description: 'AI models for creating and editing videos', icon: 'Video' },
  { slug: 'audio-editing', name: 'Audio Editing', description: 'Audio processing, editing, and generation tools', icon: 'Mic' },
  { slug: 'website-design', name: 'Website & Design', description: 'Design, UI/UX, and website creation tools', icon: 'Palette' },
  { slug: 'education', name: 'Education & Studies', description: 'Educational and learning-focused AI models', icon: 'BookOpen' },
  // New categories
  { slug: 'github-projects', name: 'GitHub Projects', description: 'GitHub integration and project management tools', icon: 'Code' },
  { slug: 'no-code-low-code', name: 'No-Code / Low-Code', description: 'No-code and low-code automation platforms', icon: 'Zap' },
  { slug: 'seo-tools', name: 'SEO Tools', description: 'Search engine optimization and ranking tools', icon: 'Zap' },
  { slug: 'text-to-speech', name: 'Text-to-Speech', description: 'Text to speech synthesis models', icon: 'Mic' },
  { slug: 'text-to-video', name: 'Text-to-Video', description: 'AI models for generating videos from text', icon: 'Video' },
  { slug: 'copywriting', name: 'Copywriting', description: 'AI-powered copywriting and marketing content creation', icon: 'BookOpen' },
  { slug: 'ai-detection', name: 'AI Detection', description: 'Tools for detecting AI-generated content', icon: 'Zap' },
  // Additional core categories
  { slug: 'chatbots', name: 'Chatbots', description: 'Conversational AI and chat assistants', icon: 'MessageSquare' },
  { slug: 'productivity', name: 'Productivity', description: 'Tools to boost productivity', icon: 'Zap' },
  { slug: 'agents', name: 'AI Agents', description: 'Agent-based automation models', icon: 'Bot' },
  { slug: 'data-analysis', name: 'Data Analysis', description: 'Models for data analytics', icon: 'Zap' },
  { slug: 'automation', name: 'Automation', description: 'Automation and workflow models', icon: 'Zap' }
];

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    // For each category, compute model count so UI can display counts
    const categoriesWithCounts = await Promise.all(
      CATEGORIES.map(async (c) => {
        const aliases = CATEGORY_ALIASES[c.slug] || [c.slug];
        const count = await Model.countDocuments({ category: { $in: aliases }, status: 'approved' });
        return { ...c, id: c.slug, modelCount: count };
      })
    );

    res.json({ success: true, data: { categories: categoriesWithCounts } });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
});

module.exports = router;
