/**
 * Script to populate pricing plans for Soch AI Script Generator
 * Run with: node populatePricingPlans.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const PricingPlan = require('./models/PricingPlan');

// Script Generator Plans
const scriptGeneratorPlans = [
  {
    planId: 'script-free',
    category: 'script-generator',
    name: 'FREE',
    description: '',
    priceUSD: 0,
    priceCents: 0,
    currency: 'USD',
    duration: 'month',
    isActive: true,
    isPopular: false,
    features: [
      '5 Script Generations / month',
      'Basic Hook + Body Structure',
      'Language Selection',
      'Save Script History'
    ],
    badge: '',
    color: 'blue',
    buttonText: 'Start Free',
    displayOrder: 1,
    trustLine: ''
  },
  {
    planId: 'script-creator',
    category: 'script-generator',
    name: 'CREATOR',
    description: 'Best for content creator',
    priceUSD: 2.16,
    priceCents: 216, // $2.16 in cents
    currency: 'USD',
    duration: 'month',
    isActive: true,
    isPopular: true,
    features: [
      'Unlimited Script Generation',
      'Hook, Body, CTA Structured Script',
      'Reference Video Analysis',
      'Tone & Target Audience Settings',
      'Script Editing & Regeneration',
      'Save Script History'
    ],
    badge: 'Best Value',
    color: 'primary',
    buttonText: 'Upgrade to Creator',
    displayOrder: 2,
    trustLine: 'Used by thousands of creators to create scripts'
  }
];

// Store Plans (for tool listing/promotion)
const storePlans = [
  {
    planId: 'store-starter',
    category: 'store',
    name: 'Starter Listing',
    description: 'Best for early projects',
    priceUSD: 2.99,
    priceCents: 299, // $2.99 in cents
    currency: 'USD',
    duration: 'month',
    isActive: true,
    isPopular: false,
    features: [
      'AI tool listed for 30 days',
      'Basic discovery traffic',
      'Tool description + link',
      'Edit listing anytime'
    ],
    badge: '',
    color: 'blue',
    buttonText: 'Start Listing',
    displayOrder: 1
  },
  {
    planId: 'store-builder',
    category: 'store',
    name: 'Builder Listing',
    description: 'For founders serious about traffic',
    priceUSD: 8.99,
    priceCents: 899, // $8.99 in cents
    currency: 'USD',
    duration: '6-months',
    isActive: true,
    isPopular: true,
    features: [
      '6 month listing visibility',
      'Higher ranking in directory',
      'Estimated 1k–5k discovery clicks',
      'Feature updates allowed',
      'Basic analytics'
    ],
    badge: 'Recommended',
    color: 'primary',
    buttonText: 'Choose Builder',
    displayOrder: 2
  },
  {
    planId: 'store-pro',
    category: 'store',
    name: 'Pro Listing',
    description: 'For long-term exposure',
    priceUSD: 23.99,
    priceCents: 2399, // $23.99 in cents
    currency: 'USD',
    duration: 'year',
    isActive: true,
    isPopular: false,
    features: [
      '12 month listing',
      'Homepage feature (limited slots)',
      'Estimated 5k–20k discovery clicks',
      'Priority approval',
      'Advanced analytics'
    ],
    badge: '',
    color: 'orange',
    buttonText: 'Go Pro',
    displayOrder: 3
  }
];

async function populatePricingPlans() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing plans for both categories
    await PricingPlan.deleteMany({ category: { $in: ['script-generator', 'store'] } });
    console.log('🧹 Cleared existing script-generator and store plans');

    // Insert new plans
    const allPlans = [...scriptGeneratorPlans, ...storePlans];
    await PricingPlan.insertMany(allPlans);
    console.log('✅ Inserted new pricing plans for both categories');

    // Verify insertion
    const scriptPlans = await PricingPlan.find({ category: 'script-generator', isActive: true }).sort({ displayOrder: 1 });
    const storeSubscriptionPlans = await PricingPlan.find({ category: 'store', isActive: true }).sort({ displayOrder: 1 });
    
    console.log('\n📋 Current Script Generator Plans:');
    scriptPlans.forEach(plan => {
      console.log(`  - ${plan.name}: $${plan.priceUSD}/${plan.duration} (${plan.features.length} features)`);
    });
    
    console.log('\n📋 Current Store Plans:');
    storeSubscriptionPlans.forEach(plan => {
      console.log(`  - ${plan.name}: $${plan.priceUSD}/${plan.duration} (${plan.features.length} features)`);
    });

    console.log('\n🎉 Pricing plans populated successfully!');
    
  } catch (error) {
    console.error('❌ Error populating pricing plans:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  populatePricingPlans();
}

module.exports = { populatePricingPlans, scriptGeneratorPlans, storePlans };