// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const { admin } = require('../services/firebaseAdmin'); // Import your existing admin instance
// const { authenticateToken } = require('../middleware/auth');
// const { v4: uuidv4 } = require('uuid');

// // Configure Multer (Storage in memory)
// const storage = multer.memoryStorage();
// const upload = multer({ 
//   storage: storage,
//   limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
// });

// const bucketName = process.env.FIREBASE_STORAGE_BUCKET; 
// // Important: Ensure you added 'storageBucket' to your firebaseAdmin.js config 
// // OR simply pass the bucket name string to admin.storage().bucket(bucketName) below.

// // POST /api/upload/image
// router.post('/image', authenticateToken, upload.single('image'), async (req, res) => {
//   try {
//     if (!req.file) {
//       return res.status(400).json({ success: false, message: 'No image file provided' });
//     }

//     const bucket = admin.storage().bucket(bucketName);
//     const filename = `tools/${uuidv4()}-${req.file.originalname}`;
//     const file = bucket.file(filename);

//     const stream = file.createWriteStream({
//       metadata: {
//         contentType: req.file.mimetype,
//       },
//     });

//     stream.on('error', (e) => {
//       console.error(e);
//       res.status(500).json({ success: false, message: 'Upload failed' });
//     });

//     stream.on('finish', async () => {
//       // Make the file public so it can be viewed on the website
//       await file.makePublic();

//       // Construct the public URL
//       // Format: https://storage.googleapis.com/<bucket-name>/<file-path>
//       const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

//       res.json({
//         success: true,
//         url: publicUrl,
//         publicId: filename
//       });
//     });

//     stream.end(req.file.buffer);

//   } catch (error) {
//     console.error('Upload error:', error);
//     res.status(500).json({ success: false, message: 'Server error during upload' });
//   }
// });

// module.exports = router;
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { admin } = require('../services/firebaseAdmin');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Configure Multer (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    // 1. Validation
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      console.error('❌ CONFIG ERROR: FIREBASE_STORAGE_BUCKET is missing in .env');
      return res.status(500).json({ success: false, message: 'Server misconfiguration' });
    }

    console.log(`[Upload] Starting upload to: ${bucketName}`);

    // 2. Upload to Firebase
    const bucket = admin.storage().bucket(bucketName);
    const filename = `tools/${uuidv4()}-${req.file.originalname}`;
    const file = bucket.file(filename);

    const stream = file.createWriteStream({
      metadata: { contentType: req.file.mimetype }
    });

    stream.on('error', (e) => {
      console.error('❌ Stream Error:', e);
      res.status(500).json({ success: false, message: 'Upload stream failed', error: e.message });
    });

    stream.on('finish', async () => {
      try {
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
        
        console.log('✅ Upload success:', publicUrl);
        res.json({ success: true, url: publicUrl });
      } catch (err) {
        console.error('❌ Make Public Error:', err);
        // Even if makePublic fails, we return success but warn (or you can fail)
        res.status(200).json({ 
            success: true, 
            url: `https://storage.googleapis.com/${bucketName}/${filename}`,
            warning: 'Could not make public automatically' 
        });
      }
    });

    stream.end(req.file.buffer);

  } catch (error) {
    console.error('❌ General Upload Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;