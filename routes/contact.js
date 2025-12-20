const express = require('express');
const router = express.Router();
const Joi = require('joi');

const contactSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  subject: Joi.string().required(),
  message: Joi.string().min(10).required()
});

router.post('/', async (req, res) => {
  try {
    const { error, value } = contactSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    console.log('New Contact:', value);
    // TODO: Connect this to Nodemailer if you want to receive real emails
    
    res.json({ success: true, message: 'Message received!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;