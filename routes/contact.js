const express = require('express');
const router = express.Router();
const Joi = require('joi');
const Message = require('../models/Message'); // Import the model

// Joi Schema Validation
const contactSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  subject: Joi.string().required(),
  message: Joi.string().min(10).required() // Ensures message isn't empty/too short
});

// POST /api/contact
router.post('/', async (req, res) => {
  try {
    // 1. Validate Input
    const { error, value } = contactSchema.validate(req.body);
    if (error) {
      console.error("Validation Error:", error.details[0].message);
      return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { name, email, subject, message } = value;

    // 2. Auto-Categorize based on Subject (Sent from Frontend)
    let type = 'general';
    const subLower = subject.toLowerCase();
    
    if (subLower.includes('sponsorship')) {
      type = 'sponsorship';
    } else if (subLower.includes('campaign')) {
      type = 'campaign';
    } else if (subLower.includes('feature')) {
      type = 'featured';
    }

    // 3. Save to MongoDB
    const newMessage = await Message.create({
      name,
      email,
      subject,
      message,
      type,
      status: 'unread'
    });

    console.log(`✅ New Inquiry Saved: ${type} from ${email}`);

    res.status(200).json({ success: true, message: 'Request received successfully!' });

  } catch (err) {
    console.error('❌ Server Contact Error:', err);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

module.exports = router;