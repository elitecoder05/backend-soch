/**
 * Admin Pricing Management Routes
 * Manages both Store and Script Generator pricing plans
 */

const express = require('express');
const router = express.Router();
const PricingPlan = require('../models/PricingPlan');
const { authenticateToken } = require('../middleware/auth');

// Middleware to verify admin access (you should implement proper admin check)
const requireAdmin = (req, res, next) => {
    // For now, just authenticate - replace with proper admin role check
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    // TODO: Add proper admin role verification
    // if (req.user.role !== 'admin') {
    //     return res.status(403).json({ success: false, message: 'Admin access required' });
    // }
    next();
};

// GET /api/admin/pricing/plans - Get all pricing plans
router.get('/plans', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { category, active } = req.query;
        
        const filter = {};
        if (category) filter.category = category;
        if (active !== undefined) filter.isActive = active === 'true';
        
        const plans = await PricingPlan.find(filter)
            .sort({ category: 1, displayOrder: 1, createdAt: 1 })
            .populate('createdBy lastModifiedBy', 'firstName lastName email');
        
        res.json({
            success: true,
            data: { plans }
        });
    } catch (error) {
        console.error('Admin - Get plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pricing plans'
        });
    }
});

// GET /api/admin/pricing/plans/:category - Get plans by category
router.get('/plans/:category', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { category } = req.params;
        const { active = 'true' } = req.query;
        
        if (!['store', 'script-generator'].includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category. Must be store or script-generator'
            });
        }
        
        const plans = await PricingPlan.getPlansByCategory(category, active === 'true');
        
        res.json({
            success: true,
            data: { plans }
        });
    } catch (error) {
        console.error('Admin - Get plans by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pricing plans'
        });
    }
});

// POST /api/admin/pricing/plans - Create new pricing plan
router.post('/plans', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            planId,
            category,
            name,
            description,
            priceUSD,
            duration,
            features,
            isPopular,
            badge,
            color,
            buttonText,
            launchPrice,
            displayOrder
        } = req.body;
        
        // Validation
        if (!planId || !category || !name || priceUSD === undefined || !duration) {
            return res.status(400).json({
                success: false,
                message: 'Required fields: planId, category, name, priceUSD, duration'
            });
        }
        
        if (!['store', 'script-generator'].includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category. Must be store or script-generator'
            });
        }
        
        // Check if planId already exists
        const existingPlan = await PricingPlan.findOne({ planId });
        if (existingPlan) {
            return res.status(409).json({
                success: false,
                message: 'Plan ID already exists'
            });
        }
        
        const priceCents = Math.round(priceUSD * 100);
        
        const plan = new PricingPlan({
            planId,
            category,
            name,
            description,
            priceUSD: parseFloat(priceUSD),
            priceCents,
            duration,
            features: features || [],
            isPopular: Boolean(isPopular),
            badge,
            color: color || 'blue',
            buttonText: buttonText || 'Choose Plan',
            launchPrice: launchPrice ? parseFloat(launchPrice) : undefined,
            displayOrder: displayOrder || 0,
            createdBy: req.user._id,
            lastModifiedBy: req.user._id
        });
        
        await plan.save();
        
        res.status(201).json({
            success: true,
            message: 'Pricing plan created successfully',
            data: { plan }
        });
    } catch (error) {
        console.error('Admin - Create plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create pricing plan'
        });
    }
});

// PUT /api/admin/pricing/plans/:planId - Update pricing plan
router.put('/plans/:planId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { planId } = req.params;
        const updateData = { ...req.body };
        
        // Remove fields that shouldn't be updated directly
        delete updateData.planId;
        delete updateData.createdBy;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        
        // Update price cents if price USD is provided
        if (updateData.priceUSD !== undefined) {
            updateData.priceCents = Math.round(updateData.priceUSD * 100);
        }
        
        updateData.lastModifiedBy = req.user._id;
        
        const plan = await PricingPlan.findOneAndUpdate(
            { planId },
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: 'Pricing plan not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Pricing plan updated successfully',
            data: { plan }
        });
    } catch (error) {
        console.error('Admin - Update plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update pricing plan'
        });
    }
});

// DELETE /api/admin/pricing/plans/:planId - Delete pricing plan
router.delete('/plans/:planId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { planId } = req.params;
        const { permanent = false } = req.query;
        
        if (permanent === 'true') {
            // Permanent deletion
            const plan = await PricingPlan.findOneAndDelete({ planId });
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'Pricing plan not found'
                });
            }
        } else {
            // Soft delete - just deactivate
            const plan = await PricingPlan.findOneAndUpdate(
                { planId },
                { isActive: false, lastModifiedBy: req.user._id },
                { new: true }
            );
            
            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: 'Pricing plan not found'
                });
            }
        }
        
        res.json({
            success: true,
            message: permanent === 'true' ? 'Pricing plan permanently deleted' : 'Pricing plan deactivated'
        });
    } catch (error) {
        console.error('Admin - Delete plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete pricing plan'
        });
    }
});

// POST /api/admin/pricing/seed - Seed initial pricing plans
router.post('/seed', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Check if plans already exist
        const existingPlans = await PricingPlan.countDocuments();
        if (existingPlans > 0) {
            return res.status(409).json({
                success: false,
                message: 'Pricing plans already exist. Use individual endpoints to manage them.'
            });
        }
        
        const seedPlans = [
            // Store Plans
            {
                planId: 'monthly',
                category: 'store',
                name: 'Monthly',
                priceUSD: 5,
                priceCents: 500,
                duration: 'month',
                description: 'Perfect to get started',
                features: [
                    'List your AI tool for 30 days',
                    '50–100 estimated clicks (discovery traffic in first week)',
                    'Basic visibility and analytics',
                    'Edit or update your listing anytime'
                ],
                color: 'blue',
                displayOrder: 1
            },
            {
                planId: 'six_months',
                category: 'store',
                name: '6 Months',
                priceUSD: 12,
                priceCents: 1200,
                duration: '6-months',
                description: 'Best value for serious builders',
                features: [
                    '700–3,000+ estimated clicks',
                    'Website-only focused traffic',
                    'Longer listing visibility',
                    'Faster updates for new features',
                    'Enhanced analytics'
                ],
                isPopular: true,
                badge: '⭐ Most Popular',
                color: 'primary',
                displayOrder: 2
            },
            {
                planId: 'annual',
                category: 'store',
                name: '1 Year Plan',
                priceUSD: 20,
                priceCents: 2000,
                duration: 'year',
                description: 'Built for long-term growth',
                features: [
                    '800–10,000+ estimated clicks',
                    'Extra 25 days listing bonus',
                    'Free homepage feature',
                    'Stronger brand credibility',
                    'Advanced performance insights'
                ],
                color: 'orange',
                displayOrder: 3
            },
            {
                planId: 'lifetime',
                category: 'store',
                name: 'Lifetime',
                priceUSD: 99,
                priceCents: 9900,
                duration: 'lifetime',
                description: 'Limited Time – Lifetime',
                features: [
                    'Lifetime listing access',
                    'Priority review and faster approval',
                    'Lifetime Pro badge',
                    'Early access to beta features',
                    'Direct developer support'
                ],
                badge: '♾️ Limited Time',
                color: 'purple',
                displayOrder: 4
            },
            // Script Generator Plans
            {
                planId: 'script-free',
                category: 'script-generator',
                name: 'FREE',
                priceUSD: 0,
                priceCents: 0,
                duration: 'month',
                description: '',
                features: [
                    '5 Script Generations / month',
                    'Basic Hook + Body Structure',
                    'Language Selection',
                    'Save Script History'
                ],
                buttonText: 'Start Free',
                displayOrder: 1
            },
            {
                planId: 'script-creator',
                category: 'script-generator',
                name: 'CREATOR',
                priceUSD: 5,
                priceCents: 500,
                duration: 'month',
                description: 'Best for content creator',
                features: [
                    'Unlimited Script Generation',
                    'Hook, Body, CTA Structured Script',
                    'Reference Video Analysis',
                    'Tone & Target Audience Settings',
                    'Script Editing & Regeneration',
                    'Save Script History'
                ],
                isPopular: true,
                badge: 'Best Value',
                buttonText: 'Upgrade to Creator',
                launchPrice: 4,
                displayOrder: 2
            }
        ];
        
        const createdPlans = [];
        for (const planData of seedPlans) {
            planData.createdBy = req.user._id;
            planData.lastModifiedBy = req.user._id;
            const plan = new PricingPlan(planData);
            await plan.save();
            createdPlans.push(plan);
        }
        
        res.status(201).json({
            success: true,
            message: 'Pricing plans seeded successfully',
            data: { plans: createdPlans }
        });
    } catch (error) {
        console.error('Admin - Seed plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to seed pricing plans'
        });
    }
});

module.exports = router;