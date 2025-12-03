const express = require('express');
const Model = require('../models/Model');

const router = express.Router();

// Static categories list (this mirrors backend validation list)
const CATEGORIES = [
  { slug: 'chatbots', name: 'Chatbots', description: 'Conversational AI and chat assistants', icon: 'MessageSquare' },
  { slug: 'image', name: 'Image', description: 'Image generation and editing models', icon: 'Image' },
  { slug: 'code', name: 'Code', description: 'Code generation and analysis models', icon: 'Code' },
  { slug: 'productivity', name: 'Productivity', description: 'Tools to boost productivity', icon: 'Zap' },
  { slug: 'voice', name: 'Voice', description: 'Speech and voice-based models', icon: 'Mic' },
  { slug: 'writing', name: 'Writing', description: 'Writing and editing models', icon: 'BookOpen' },
  { slug: 'research', name: 'Research', description: 'Research and analytics models', icon: 'Bot' },
  { slug: 'agents', name: 'Agents', description: 'Agent-based automation models', icon: 'Bot' },
  { slug: 'video', name: 'Video', description: 'Video generation and editing', icon: 'Video' },
  { slug: 'audio', name: 'Audio', description: 'Audio processing and generation', icon: 'Mic' },
  { slug: 'data-analysis', name: 'Data Analysis', description: 'Models for data analytics', icon: 'Zap' },
  { slug: 'language', name: 'Language', description: 'Translation and language models', icon: 'BookOpen' },
  { slug: 'design', name: 'Design', description: 'Design and creative models', icon: 'Palette' },
  { slug: 'automation', name: 'Automation', description: 'Automation and workflow models', icon: 'Zap' },
  { slug: 'healthcare', name: 'Healthcare', description: 'Healthcare and medical models', icon: 'Heart' },
  { slug: 'education', name: 'Education', description: 'Educational models', icon: 'BookOpen' },
  { slug: 'marketing', name: 'Marketing', description: 'Marketing and ad creation models', icon: 'Zap' },
  { slug: 'finance', name: 'Finance', description: 'Finance and analysis models', icon: 'Zap' }
];

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    // For each category, compute model count so UI can display counts
    const categoriesWithCounts = await Promise.all(
      CATEGORIES.map(async (c) => {
        const count = await Model.countDocuments({ category: c.slug, status: 'approved' });
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
