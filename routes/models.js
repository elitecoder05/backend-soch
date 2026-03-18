
const express = require('express');
const Joi = require('joi');
const Model = require('../models/Model');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const normalizeStringArray = (arr = []) => {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((item) => String(item || '').trim()).filter(Boolean))];
};

const escapeRegex = (str = '') => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeForSearch = (str = '') =>
  String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const tokenizeForSearch = (str = '') =>
  String(str)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const isSubsequence = (source = '', target = '') => {
  if (!source || !target) return false;
  let i = 0;
  let j = 0;
  while (i < source.length && j < target.length) {
    if (source[i] === target[j]) j++;
    i++;
  }
  return j === target.length;
};

const boundedLevenshtein = (a = '', b = '', maxDistance = 2) => {
  if (!a || !b) return Math.max(a.length, b.length);
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
};

const buildSearchContext = (rawQuery = '') => {
  const trimmed = String(rawQuery || '').trim();
  const normalized = normalizeForSearch(trimmed);
  const tokens = tokenizeForSearch(trimmed);
  const safeTrimmed = escapeRegex(trimmed);
  const safeNormalized = escapeRegex(normalized);

  const conditions = [
    { name: { $regex: safeTrimmed, $options: 'i' } },
    { shortDescription: { $regex: safeTrimmed, $options: 'i' } },
    { longDescription: { $regex: safeTrimmed, $options: 'i' } },
    { provider: { $regex: safeTrimmed, $options: 'i' } },
    { tags: { $in: [new RegExp(safeTrimmed, 'i')] } },
    { category: { $regex: safeTrimmed, $options: 'i' } },
  ];

  if (normalized && normalized !== trimmed.toLowerCase()) {
    conditions.push(
      { name: { $regex: safeNormalized, $options: 'i' } },
      { shortDescription: { $regex: safeNormalized, $options: 'i' } },
      { provider: { $regex: safeNormalized, $options: 'i' } },
      { tags: { $in: [new RegExp(safeNormalized, 'i')] } },
    );
  }

  if (tokens.length > 1) {
    const allWordsPattern = tokens.map((w) => `(?=.*${escapeRegex(w)})`).join('');
    conditions.push(
      { name: { $regex: allWordsPattern, $options: 'i' } },
      { shortDescription: { $regex: allWordsPattern, $options: 'i' } },
      { tags: { $in: [new RegExp(allWordsPattern, 'i')] } },
    );
  }

  // Subsequence regex helps typo-like inputs such as "cht gpt" match "chatgpt".
  if (normalized.length >= 4) {
    const subsequencePattern = normalized.split('').map((ch) => escapeRegex(ch)).join('.*');
    conditions.push(
      { name: { $regex: subsequencePattern, $options: 'i' } },
      { tags: { $in: [new RegExp(subsequencePattern, 'i')] } },
    );
  }

  return {
    raw: trimmed,
    normalized,
    tokens,
    conditions,
  };
};

const scoreModelAgainstSearch = (model, ctx) => {
  if (!ctx || !ctx.normalized) return 0;

  const name = String(model.name || '');
  const nameLower = name.toLowerCase();
  const nameNormalized = normalizeForSearch(name);

  const providerLower = String(model.provider || '').toLowerCase();
  const shortLower = String(model.shortDescription || '').toLowerCase();
  const longLower = String(model.longDescription || '').toLowerCase();
  const tags = Array.isArray(model.tags) ? model.tags.map((t) => String(t || '').toLowerCase()) : [];
  const categoryLower = String(model.category || '').toLowerCase();

  let score = 0;

  // Strong name matching signals.
  if (nameNormalized === ctx.normalized) score += 2500;
  if (nameLower === ctx.raw.toLowerCase()) score += 1800;
  if (nameNormalized.startsWith(ctx.normalized)) score += 1300;
  if (nameNormalized.includes(ctx.normalized)) score += 1000;
  if (isSubsequence(nameNormalized, ctx.normalized)) score += 700;

  const typoDistance = boundedLevenshtein(nameNormalized, ctx.normalized, 2);
  if (typoDistance <= 2) score += 650 - (typoDistance * 120);

  if (ctx.tokens.length > 0 && ctx.tokens.every((t) => nameLower.includes(t))) score += 900;
  if (ctx.tokens.length > 1 && ctx.tokens.some((t) => t.length >= 3 && nameLower.startsWith(t))) score += 180;

  // Secondary fields.
  if (providerLower.includes(ctx.raw.toLowerCase()) || normalizeForSearch(providerLower).includes(ctx.normalized)) score += 220;
  if (shortLower.includes(ctx.raw.toLowerCase())) score += 170;
  if (longLower.includes(ctx.raw.toLowerCase())) score += 120;
  if (categoryLower.includes(ctx.raw.toLowerCase())) score += 90;

  const tagExact = tags.some((t) => normalizeForSearch(t) === ctx.normalized);
  const tagContains = tags.some((t) => normalizeForSearch(t).includes(ctx.normalized));
  if (tagExact) score += 460;
  else if (tagContains) score += 260;

  // Keep business signals as tie-breakers, not primary rank.
  if (model.hasCustomCampaign) score += 35;
  if (model.featured) score += 30;
  if (model.isSponsored) score += 25;
  score += Math.min(25, Number(model.trendingScore || 0) * 0.2);
  score += Math.min(12, Number(model.rating || 0) * 2);

  return score;
};

// --- Validation Schemas ---
const modelSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  shortDescription: Joi.string().trim().max(200).required(),
  longDescription: Joi.string().trim().max(2000).allow(''),
  category: Joi.string().required(),
  tags: Joi.array().items(Joi.string().trim().max(30)).default([]),
  provider: Joi.string().trim().max(50).required(),
  pricing: Joi.string().valid('free', 'freemium', 'paid').default('freemium'),
  capabilities: Joi.array().items(Joi.string()).default([]),
  isApiAvailable: Joi.boolean().default(false),
  isOpenSource: Joi.boolean().default(false),
  modelType: Joi.string().allow(''),
  externalUrl: Joi.string().uri().allow(''),
  iconUrl: Joi.string().uri().allow(''),
  bestFor: Joi.array().default([]),
  features: Joi.array().default([]),
  examplePrompts: Joi.array().default([]),
  screenshots: Joi.array().max(4).default([]),
  pricingPlans: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      price: Joi.string().required(),
      billingCycle: Joi.string().valid('one-time', 'monthly', 'yearly', 'free').default('monthly'),
      features: Joi.array().items(Joi.string()).default([])
    })
  ).default([]),
  faqs: Joi.array().items(
    Joi.object({
      question: Joi.string().required(),
      answer: Joi.string().required()
    })
  ).default([])
});

// GET /api/models/admin/all - Fetch models for Admin Dashboard
router.get('/admin/all', authenticateToken, async (req, res) => {
  try {
    // In a real app, verify req.user.role === 'admin' here
    const { status } = req.query;
    const filter = {};
    
    // Filter logic: if 'status' is provided and not 'all', use it.
    if (status && status !== 'all') {
      filter.status = status;
    }

    const models = await Model.find(filter)
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { models } });
  } catch (error) {
    console.error('Admin fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/models/admin/:id/status - Approve/Reject Model
router.put('/admin/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    
    const updateData = { status };
    if (status === 'rejected') {
      updateData.rejectionReason = rejectionReason;
    } else if (status === 'approved') {
      updateData.rejectionReason = ''; // Clear reason on approval
    }

    const model = await Model.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('uploadedBy', 'firstName lastName');

    res.json({ success: true, data: { model } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/admin/:id/trending', authenticateToken, async (req, res) => {
  try {
    console.log("🔵 BACKEND: Received Trending Update Request");
    console.log("👉 Body received:", req.body); // Check if hasCustomCampaign is here

    // 1. Security Check
    if (req.user.role !== 'admin') {
      console.log("⛔ Access denied: User is not admin");
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { 
      trendingScore, 
      categoryTrendingScore, 
      featured, 
      isSponsored,        
      hasCustomCampaign   
    } = req.body;

    const modelId = req.params.id;

    // 2. Construct Update Object
    const updateData = {};
    if (trendingScore !== undefined) updateData.trendingScore = trendingScore;
    if (categoryTrendingScore !== undefined) updateData.categoryTrendingScore = categoryTrendingScore;
    if (featured !== undefined) updateData.featured = featured;
    if (isSponsored !== undefined) updateData.isSponsored = isSponsored;
    if (hasCustomCampaign !== undefined) updateData.hasCustomCampaign = hasCustomCampaign;

    console.log("📝 Update Data Object Constructed:", updateData);

    // 3. Perform Update
    const updatedModel = await Model.findByIdAndUpdate(
      modelId,
      { $set: updateData },
      { new: true } 
    );

    if (!updatedModel) {
      return res.status(404).json({ success: false, message: 'Model not found' });
    }

    console.log("✅ DB Update Success. New hasCustomCampaign value:", updatedModel.hasCustomCampaign);

    res.json({ success: true, data: { model: updatedModel } });
  } catch (error) {
    console.error('❌ Update Trending Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/models/my-models - Fetch logged-in user's models
// ⚠️ CRITICAL: This MUST be defined BEFORE router.get('/:id')
router.get('/my-models', authenticateToken, async (req, res) => {
  try {
    const models = await Model.find({ uploadedBy: req.user._id })
      .sort({ createdAt: -1 }); // Newest first

    res.json({ success: true, data: { models } });
  } catch (error) {
    console.error('Fetch user models error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/models - Upload a new AI model (User Protected)
router.post('/', authenticateToken, async (req, res) => {
  try {
    // 1. Check Pro Status
    if (!req.user.isProUser) {
      return res.status(403).json({ success: false, message: 'Pro subscription required to upload models.' });
    }

    // 2. Validate
    const { error, value } = modelSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    value.tags = normalizeStringArray(value.tags);

    // 3. Duplicate Check
    const existingModel = await Model.findOne({ name: value.name, uploadedBy: req.user._id });
    if (existingModel) return res.status(400).json({ success: false, message: 'You have already uploaded a model with this name' });

    // 4. Save
    const model = new Model({
      ...value,
      uploadedBy: req.user._id
    });
    await model.save();

    // 5. Link to User
    await User.findByIdAndUpdate(req.user._id, { $push: { uploadedModels: model._id } });

    res.status(201).json({ success: true, message: 'Model submitted successfully', data: { model } });

  } catch (error) {
    console.error('Model upload error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/models/:id - Update an Existing Model (User must own it)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // 1. Validate Input
    const { error, value } = modelSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });
    value.tags = normalizeStringArray(value.tags);

    // 2. Find the model and verify ownership
    const model = await Model.findOne({ _id: req.params.id, uploadedBy: req.user._id });
    if (!model) {
      return res.status(404).json({ 
        success: false, 
        message: 'Model not found or you do not have permission to edit this model' 
      });
    }

    // 3. Update the model fields
    Object.assign(model, value);
    
    // 4. Reset status to pending if it was previously approved/rejected
    if (model.status === 'approved' || model.status === 'rejected') {
      model.status = 'pending';
      model.rejectionReason = '';
    }

    await model.save();

    res.json({ 
      success: true, 
      message: 'Model updated successfully. It will be reviewed again.', 
      data: { model } 
    });

  } catch (error) {
    console.error('Model update error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/models - Public Listing with Advanced Filters & Smart Ranking
router.get('/', async (req, res) => {
  try {
    const { category, search, pricing, page = 1, limit = 20, randomize } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Category alias mapping for backward compatibility
    const CATEGORY_ALIASES = {
      'image-to-image': ['image-to-image', 'image'],
      'code-ai': ['code-ai', 'code'],
      'video-generation': ['video-generation', 'video'],
      'audio-editing': ['audio-editing', 'audio'],
      'copywriting': ['copywriting', 'marketing'],
      'chatbots': ['chatbots']
    };
    
    // Default filter: Only show APPROVED models to the public
    const filter = { status: 'approved' }; 
    
    if (category && category !== 'all') {
      const categoryAliases = CATEGORY_ALIASES[category] || [category];
      filter.category = { $in: categoryAliases };
    }
    
    // ✅ NEW: Add pricing filter support
    if (pricing && pricing !== 'all') {
      filter.pricing = pricing;
    }
    
    const hasSearch = typeof search === 'string' && search.trim().length >= 2;
    const searchCtx = hasSearch ? buildSearchContext(search) : null;

    if (searchCtx) {
      filter.$or = searchCtx.conditions;
    }

    let models;
    
    // ✅ IMPROVED RANKING LOGIC: Prioritize based on multiple factors
    if (randomize === 'true' && !hasSearch) {
      // For homepage: show sponsored/featured first, then randomized
      const priorityModels = await Model.find({ 
        ...filter, 
        $or: [{ hasCustomCampaign: true }, { featured: true }, { isSponsored: true }]
      }).populate('uploadedBy', 'firstName lastName');
      
      const regularModels = await Model.aggregate([
        { 
          $match: { 
            ...filter, 
            hasCustomCampaign: { $ne: true },
            featured: { $ne: true },
            isSponsored: { $ne: true }
          } 
        },
        { $sample: { size: limitNum } }
      ]);
      
      await Model.populate(regularModels, { path: 'uploadedBy', select: 'firstName lastName' });
      models = [...priorityModels, ...regularModels].slice(skip, skip + limitNum);
    } else {
      if (searchCtx) {
        // For search, pull a larger candidate set and rank by textual relevance first.
        const candidateFetchSize = Math.min(2500, Math.max(250, skip + (limitNum * 20)));

        const candidates = await Model.find(filter)
          .populate('uploadedBy', 'firstName lastName')
          .sort({
            hasCustomCampaign: -1,
            featured: -1,
            isSponsored: -1,
            trendingScore: -1,
            categoryTrendingScore: -1,
            rating: -1,
            reviewsCount: -1,
            createdAt: -1,
          })
          .limit(candidateFetchSize);

        models = candidates
          .map((m) => ({ model: m, searchScore: scoreModelAgainstSearch(m, searchCtx) }))
          .sort((a, b) => {
            if (b.searchScore !== a.searchScore) return b.searchScore - a.searchScore;
            if ((b.model.hasCustomCampaign ? 1 : 0) !== (a.model.hasCustomCampaign ? 1 : 0)) {
              return (b.model.hasCustomCampaign ? 1 : 0) - (a.model.hasCustomCampaign ? 1 : 0);
            }
            if ((b.model.featured ? 1 : 0) !== (a.model.featured ? 1 : 0)) {
              return (b.model.featured ? 1 : 0) - (a.model.featured ? 1 : 0);
            }
            if ((b.model.isSponsored ? 1 : 0) !== (a.model.isSponsored ? 1 : 0)) {
              return (b.model.isSponsored ? 1 : 0) - (a.model.isSponsored ? 1 : 0);
            }
            return new Date(b.model.createdAt).getTime() - new Date(a.model.createdAt).getTime();
          })
          .slice(skip, skip + limitNum)
          .map(({ model }) => model);
      } else {
        models = await Model.find(filter)
          .populate('uploadedBy', 'firstName lastName')
          .sort({
            hasCustomCampaign: -1,
            featured: -1,
            isSponsored: -1,
            trendingScore: -1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(limitNum);
      }
    }

    const total = await Model.countDocuments(filter);

    res.json({
      success: true,
      data: {
        models,
        pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/models/search/suggestions - Quick search dropdown (must be before /:id)
router.get('/search/suggestions', async (req, res) => {
  try {
    const { q, limit = 8 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: { suggestions: [], query: q || '' } });
    }

    const limitNum = parseInt(limit, 10) || 8;
    const searchCtx = buildSearchContext(q);

    const suggestionCandidates = await Model.find({ status: 'approved', $or: searchCtx.conditions })
      .select('name slug iconUrl shortDescription category provider pricing')
      .sort({ hasCustomCampaign: -1, featured: -1, isSponsored: -1, trendingScore: -1, createdAt: -1 })
      .limit(120);

    const suggestions = suggestionCandidates
      .map((m) => ({ model: m, searchScore: scoreModelAgainstSearch(m, searchCtx) }))
      .sort((a, b) => {
        if (b.searchScore !== a.searchScore) return b.searchScore - a.searchScore;
        return (b.model.trendingScore || 0) - (a.model.trendingScore || 0);
      })
      .slice(0, limitNum)
      .map(({ model }) => model);

    res.json({
      success: true,
      data: {
        suggestions: suggestions.map(m => ({
          id: m._id,
          name: m.name,
          slug: m.slug,
          iconUrl: m.iconUrl || null,
          shortDescription: m.shortDescription,
          category: m.category,
          provider: m.provider,
          pricing: m.pricing,
        })),
        query: trimmed,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/models/:id/people-also-viewed - Recommend other models users viewed
router.get('/:id/people-also-viewed', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 6 } = req.query;
    const mongoose = require('mongoose');

    // 1. Resolve model by id or slug
    let model = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      model = await Model.findById(id);
    }
    if (!model) {
      model = await Model.findOne({ slug: id });
    }
    if (!model) return res.json({ success: true, data: { models: [] } });

    // 2. Try to fetch models from same category first (exclude current)
    const sameCategory = await Model.find({
      _id: { $ne: model._id },
      category: model.category,
      status: 'approved'
    })
      .populate('uploadedBy', 'firstName lastName')
      .sort({ trendingScore: -1, createdAt: -1 })
      .limit(parseInt(limit));

    // 3. If not enough, fill with other popular models
    let results = sameCategory || [];
    if (results.length < parseInt(limit)) {
      const needed = parseInt(limit) - results.length;
      const filler = await Model.find({
        _id: { $nin: [model._id, ...results.map(r => r._id)] },
        status: 'approved'
      })
        .populate('uploadedBy', 'firstName lastName')
        .sort({ trendingScore: -1, createdAt: -1 })
        .limit(needed);

      results = results.concat(filler);
    }

    res.json({ success: true, data: { models: results } });
  } catch (error) {
    console.error('People also viewed error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/models/:id - Delete a Model (User must own it)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // 1. Find the model and verify ownership
    const model = await Model.findOne({ _id: req.params.id, uploadedBy: req.user._id });
    
    if (!model) {
      return res.status(404).json({ 
        success: false, 
        message: 'Model not found or you do not have permission to delete this model' 
      });
    }

    // 2. Delete the model
    await Model.findByIdAndDelete(req.params.id);

    // 3. Remove from user's uploadedModels array
    await User.findByIdAndUpdate(req.user._id, { 
      $pull: { uploadedModels: req.params.id } 
    });

    res.json({ 
      success: true, 
      message: 'Model deleted successfully' 
    });

  } catch (error) {
    console.error('Model delete error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/models/stats/count - Total model counts across all categories (public)
router.get('/stats/count', async (req, res) => {
  try {
    const [total, approved, pending, rejected, byCategory] = await Promise.all([
      Model.countDocuments({}),
      Model.countDocuments({ status: 'approved' }),
      Model.countDocuments({ status: 'pending' }),
      Model.countDocuments({ status: 'rejected' }),
      Model.aggregate([
        {
          $group: {
            _id: '$category',
            total: { $sum: 1 },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
          }
        },
        { $sort: { approved: -1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        total,
        approved,
        pending,
        rejected,
        byCategory: byCategory.map(c => ({
          category: c._id,
          total: c.total,
          approved: c.approved
        }))
      }
    });
  } catch (error) {
    console.error('Stats count error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/models/featured-for/:category - Get up to 2 actively boosted tools for a category
// ⚠️ Must be defined BEFORE /:id to avoid conflict
router.get('/featured-for/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const now = new Date();

    const featured = await Model.find({
      category,
      status: 'approved',
      featured: true,
      featuredExpiresAt: { $gt: now }
    })
      .select('_id name slug shortDescription iconUrl category featured featuredExpiresAt')
      .sort({ featuredExpiresAt: -1 })
      .limit(2);

    res.json({ success: true, data: { models: featured } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/models/:id/boost - Boost a model for N days (max 2 per category)
router.post('/:id/boost', authenticateToken, async (req, res) => {
  try {
    const { days } = req.body;
    const parsedDays = parseInt(days);

    if (!parsedDays || parsedDays < 1 || parsedDays > 90) {
      return res.status(400).json({ success: false, message: 'Boost duration must be between 1 and 90 days.' });
    }

    const mongoose = require('mongoose');
    let model = null;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      model = await Model.findOne({ _id: req.params.id, uploadedBy: req.user._id, status: 'approved' });
    }
    if (!model) {
      model = await Model.findOne({ slug: req.params.id, uploadedBy: req.user._id, status: 'approved' });
    }

    if (!model) {
      return res.status(404).json({ success: false, message: 'Model not found, not yet approved, or you do not own it.' });
    }

    // Check category limit: at most 2 actively boosted models per category (excluding this model)
    const now = new Date();
    const activeBoostedCount = await Model.countDocuments({
      category: model.category,
      featured: true,
      featuredExpiresAt: { $gt: now },
      _id: { $ne: model._id }
    });

    if (activeBoostedCount >= 2) {
      return res.status(400).json({
        success: false,
        message: `Only 2 tools can be featured in the "${model.category}" category at a time. Please wait for an active boost to expire and try again.`
      });
    }

    const boostEndDate = new Date(now.getTime() + parsedDays * 24 * 60 * 60 * 1000);

    const updatedModel = await Model.findByIdAndUpdate(
      model._id,
      { $set: { featured: true, featuredExpiresAt: boostEndDate } },
      { new: true }
    );

    res.json({
      success: true,
      message: `"${model.name}" is now featured for ${parsedDays} days!`,
      data: { model: updatedModel, boostEndDate }
    });
  } catch (error) {
    console.error('Boost model error:', error);
    res.status(500).json({ success: false, message: 'Failed to boost model.' });
  }
});

// GET /api/models/:id - Get Single Model Details (supports both ID and slug)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let model = null;

    // Try to find by ObjectId first (if it's a valid ObjectId)
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      model = await Model.findById(id).populate('uploadedBy', 'firstName lastName');
    }
    
    // If not found or invalid ObjectId, try to find by slug
    if (!model) {
      model = await Model.findOne({ slug: id }).populate('uploadedBy', 'firstName lastName');
    }

    if (!model) return res.status(404).json({ success: false, message: 'Model not found' });

    // 🛡️ SECURITY: If tool is NOT approved, block everyone except Admins
    if (model.status !== 'approved') {
       // Note: authenticateToken must be applied for req.user to exist
       if (!req.user || req.user.role !== 'admin') {
         return res.status(403).json({ success: false, message: 'This tool is currently unavailable.' });
       }
    }
    
    res.json({ success: true, data: { model } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/models/:id/promote - Allow user to feature their own model (Simulated Payment)
router.post('/:id/promote', authenticateToken, async (req, res) => {
  try {
    const modelId = req.params.id;
    const userId = req.user._id;
    const mongoose = require('mongoose');

    // 1. Find the model AND ensure it belongs to the logged-in user
    let model = null;
    if (mongoose.Types.ObjectId.isValid(modelId)) {
      model = await Model.findOne({ _id: modelId, uploadedBy: userId });
    }
    if (!model) {
      model = await Model.findOne({ slug: modelId, uploadedBy: userId });
    }

    if (!model) {
      return res.status(404).json({ 
        success: false, 
        message: 'Model not found or you do not have permission to promote this tool.' 
      });
    }

    // 2. Apply "Featured" status and boost scores
    model.featured = true;
    model.trendingScore = (model.trendingScore || 0) + 50; // Boost score
    model.categoryTrendingScore = (model.categoryTrendingScore || 0) + 50;
    
    await model.save();

    console.log(`✅ User promoted model: ${model.name}`);

    res.json({ success: true, message: 'Payment successful! Your tool is now featured.', data: { model } });

  } catch (error) {
    console.error('Promotion Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// DELETE /api/models/:id - Delete a model
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const modelId = req.params.id;
    const userId = req.user._id;
    const mongoose = require('mongoose');

    // 1. Find the model
    let model = null;
    if (mongoose.Types.ObjectId.isValid(modelId)) {
      model = await Model.findById(modelId);
    }
    if (!model) {
      model = await Model.findOne({ slug: modelId });
    }
    
    if (!model) {
      return res.status(404).json({ 
        success: false, 
        message: 'Model not found' 
      });
    }

    // 2. Security Check: Ensure the user deleting it OWNS the model (or is Admin)
    // We compare strings because ObjectIds might behave differently
    if (model.uploadedBy.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to delete this model.' 
      });
    }

    // 3. Delete from Model collection
    await Model.findByIdAndDelete(model._id);

    // 4. (Optional but recommended) Remove reference from User collection
    await User.findByIdAndUpdate(userId, { 
      $pull: { uploadedModels: model._id } 
    });

    console.log(`🗑️ Model deleted: ${model.name} by user ${userId}`);

    res.json({ 
      success: true, 
      message: 'Model deleted successfully' 
    });

  } catch (error) {
    console.error('Delete Model Error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});


module.exports = router;
