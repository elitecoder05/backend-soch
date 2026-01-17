
const express = require('express');
const Joi = require('joi');
const Model = require('../models/Model');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// --- Validation Schemas ---
const modelSchema = Joi.object({
  name: Joi.string().trim().max(100).required(),
  shortDescription: Joi.string().trim().max(200).required(),
  longDescription: Joi.string().trim().max(2000).allow(''),
  category: Joi.string().required(),
  tags: Joi.array().items(Joi.string().max(30)).default([]),
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
  screenshots: Joi.array().max(4).default([])
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

// GET /api/models - Public Listing
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20, randomize } = req.query;
    const skip = (page - 1) * limit;
    
    // Default filter: Only show APPROVED models to the public
    const filter = { status: 'approved' }; 
    
    if (category && category !== 'all') filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } }
      ];
    }

    let models;
    
    // If randomize is enabled (default for homepage)
    if (randomize === 'true') {
      // Fetch prioritized models first
      const priorityModels = await Model.find({ 
        ...filter, 
        $or: [{ hasCustomCampaign: true }, { featured: true }, { isSponsored: true }]
      }).populate('uploadedBy', 'firstName lastName');
      
      // Fetch regular models with random sampling
      const regularModels = await Model.aggregate([
        { 
          $match: { 
            ...filter, 
            hasCustomCampaign: { $ne: true },
            featured: { $ne: true },
            isSponsored: { $ne: true }
          } 
        },
        { $sample: { size: parseInt(limit) } }
      ]);
      
      // Populate uploadedBy for regular models
      await Model.populate(regularModels, { path: 'uploadedBy', select: 'firstName lastName' });
      
      // Combine: priority first, then randomized regular models
      models = [...priorityModels, ...regularModels].slice(skip, skip + parseInt(limit));
    } else {
      // Traditional sorting for specific queries/searches
      models = await Model.find(filter)
        .populate('uploadedBy', 'firstName lastName')
        .sort({ hasCustomCampaign: -1, featured: -1, trendingScore: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));
    }

    const total = await Model.countDocuments(filter);

    res.json({
      success: true,
      data: {
        models,
        pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
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

// GET /api/models/:id - Get Single Model Details
router.get('/:id', async (req, res) => {
  try {
    const model = await Model.findById(req.params.id).populate('uploadedBy', 'firstName lastName');
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

    // 1. Find the model AND ensure it belongs to the logged-in user
    const model = await Model.findOne({ _id: modelId, uploadedBy: userId });

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

    // 1. Find the model
    const model = await Model.findById(modelId);
    
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
    await Model.findByIdAndDelete(modelId);

    // 4. (Optional but recommended) Remove reference from User collection
    await User.findByIdAndUpdate(userId, { 
      $pull: { uploadedModels: modelId } 
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
