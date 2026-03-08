/**
 * Pricing Plan Model - Manages different pricing plan types
 * Supports both Store Plans and Soch AI App Plans
 */

const mongoose = require('mongoose');

const pricingPlanSchema = new mongoose.Schema({
    // Plan Identification
    planId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // Plan Category: store or script-generator
    category: {
        type: String,
        required: true,
        enum: ['store', 'script-generator'],
        index: true
    },
    
    // Plan Details
    name: {
        type: String,
        required: true,
        maxlength: 100
    },
    
    description: {
        type: String,
        maxlength: 500
    },
    
    // Pricing
    priceUSD: {
        type: Number,
        required: true,
        min: 0
    },
    
    priceCents: {
        type: Number,
        required: true,
        min: 0
    },
    
    currency: {
        type: String,
        default: 'USD',
        enum: ['USD']
    },
    
    // Duration 
    duration: {
        type: String,
        required: true,
        enum: ['month', '6-months', 'year', 'one-time', 'lifetime']
    },
    
    // Plan Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    
    isPopular: {
        type: Boolean,
        default: false
    },
    
    // Features
    features: [{
        type: String,
        maxlength: 200
    }],
    
    // Display Configuration
    badge: {
        type: String,
        maxlength: 50
    },
    
    color: {
        type: String,
        enum: ['blue', 'primary', 'orange', 'purple', 'green'],
        default: 'blue'
    },
    
    // Special pricing (like launch offers)
    launchPrice: {
        type: Number,
        min: 0
    },
    
    buttonText: {
        type: String,
        maxlength: 50,
        default: 'Choose Plan'
    },
    
    // Trust line text (displayed below the button)
    trustLine: {
        type: String,
        maxlength: 200
    },
    
    // Order for display
    displayOrder: {
        type: Number,
        default: 0
    },

    // Admin Configuration
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
    
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
pricingPlanSchema.index({ category: 1, isActive: 1, displayOrder: 1 });
pricingPlanSchema.index({ planId: 1, isActive: 1 });

// Virtual for formatted price
pricingPlanSchema.virtual('formattedPrice').get(function() {
    return `$${this.priceUSD}`;
});

// Method to convert to frontend format
pricingPlanSchema.methods.toFrontendFormat = function() {
    return {
        id: this.planId,
        name: this.name,
        price: this.formattedPrice,
        duration: this.duration,
        description: this.description,
        features: this.features,
        popular: this.isPopular,
        badge: this.badge,
        color: this.color,
        buttonText: this.buttonText,
        trustLine: this.trustLine,
        launchPrice: this.launchPrice ? `$${this.launchPrice}` : undefined
    };
};

// Static method to get plans by category
pricingPlanSchema.statics.getPlansByCategory = function(category, activeOnly = true) {
    const filter = { category };
    if (activeOnly) filter.isActive = true;
    
    return this.find(filter).sort({ displayOrder: 1, createdAt: 1 });
};

// Static method to get payment amount for planId
pricingPlanSchema.statics.getPaymentAmount = function(planId) {
    return this.findOne({ planId, isActive: true }).select('priceCents launchPrice').then(plan => {
        if (!plan) return null;
        // Return launch price if available, otherwise regular price
        const priceToUse = plan.launchPrice || (plan.priceCents / 100);
        return Math.round(priceToUse * 100); // Convert to cents
    });
};

module.exports = mongoose.model('PricingPlan', pricingPlanSchema);