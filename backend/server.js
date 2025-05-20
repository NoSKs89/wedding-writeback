console.log("--- SERVER.JS VERSION 3 - S3 ENABLED ---"); 
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// AWS SDK v3 imports
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid'); // For generating unique file names

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize S3 Client
// Ensure your .env file has AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET_NAME
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit process with failure
  });

// Import Item model
const Item = require('./models/Item');
const WeddingData = require('./models/WeddingData'); // Import the WeddingData model
const Rsvp = require('./models/Rsvp'); // Import the Rsvp model

// Simple GET endpoint
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

// Route to create a new item
app.post('/api/items', async (req, res) => {
  try {
    const newItem = new Item({
      name: req.body.name
    });
    const item = await newItem.save();
    res.status(201).json(item);
  } catch (err) {
    console.error('Error creating item:', err.message);
    res.status(400).json({ message: 'Error creating item', error: err.message });
  }
});

// Route to get all items
app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    console.error('Error fetching items:', err.message);
    res.status(500).json({ message: 'Error fetching items', error: err.message });
  }
});

// Route to create new wedding data
app.post('/api/weddings', async (req, res) => {
  try {
    // For simplicity, this route will replace existing data if customId matches,
    // or create a new one. Use with caution or add more specific logic for updates.
    const weddingPayload = req.body;
    if (!weddingPayload.customId) {
      return res.status(400).json({ message: 'customId is required' });
    }
    const wedding = await WeddingData.findOneAndUpdate(
      { customId: weddingPayload.customId },
      weddingPayload,
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json(wedding);
  } catch (err) {
    console.error('Error creating/updating wedding data:', err.message);
    // Check for duplicate key error (if customId wasn't unique and upsert was false)
    if (err.code === 11000) {
        return res.status(409).json({ message: 'Wedding data with this customId already exists.', error: err.message });
    }
    res.status(400).json({ message: 'Error creating/updating wedding data', error: err.message });
  }
});

// Route to get wedding data by customId
app.get('/api/weddings/:customId', async (req, res) => {
  try {
    const wedding = await WeddingData.findOne({ customId: req.params.customId });
    if (!wedding) {
      return res.status(404).json({ message: 'Wedding data not found' });
    }
    res.json(wedding);
  } catch (err) {
    console.error('Error fetching wedding data:', err.message);
    res.status(500).json({ message: 'Error fetching wedding data', error: err.message });
  }
});

// New endpoint to generate a pre-signed URL for S3
app.post('/api/s3/presigned-url', async (req, res) => {
  try {
    const { fileName, fileType, weddingId, imageType } = req.body;
    if (!fileName || !fileType || !weddingId || !imageType) {
      return res.status(400).json({ message: 'fileName, fileType, weddingId, and imageType are required.' });
    }

    let s3KeyPrefix = '';
    switch (imageType) {
      case 'introCouple':
      case 'introBackground':
        s3KeyPrefix = `${weddingId}/main/`;
        break;
      case 'scrapbook':
        s3KeyPrefix = `${weddingId}/scrapbook/`;
        break;
      default:
        return res.status(400).json({ message: 'Invalid imageType specified.' });
    }

    const uniqueFileName = `${s3KeyPrefix}${uuidv4()}-${fileName.replace(/\s+/g, '_')}`;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      ContentType: fileType,
      // ACL: 'public-read', // ACL can be set here if bucket policy doesn't cover it or for specific object needs
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
    const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;

    res.json({ presignedUrl, publicUrl, key: uniqueFileName });
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    res.status(500).json({ message: 'Error generating pre-signed URL', error: error.message });
  }
});

// New endpoint to save image information to WeddingData after S3 upload
app.post('/api/weddings/:customId/images', async (req, res) => {
  try {
    const { customId } = req.params;
    const { imageUrl, caption, s3Key, imageType } = req.body;

    if (!imageUrl || !imageType) {
      return res.status(400).json({ message: 'imageUrl and imageType are required.' });
    }

    const wedding = await WeddingData.findOne({ customId });
    if (!wedding) {
      return res.status(404).json({ message: 'Wedding data not found.' });
    }

    let updatedFields = {};

    if (imageType === 'introCouple') {
      wedding.introCouple = imageUrl;
      updatedFields.introCouple = imageUrl;
    } else if (imageType === 'introBackground') {
      wedding.introBackground = imageUrl;
      updatedFields.introBackground = imageUrl;
    } else if (imageType === 'scrapbook') {
      const newScrapbookImage = {
        fileName: imageUrl, // Storing the full public URL
        caption: caption || '',
        uploadedAt: new Date(),
        // s3Key: s3Key // Optional: store the S3 key if needed for direct S3 operations later
      };
      wedding.scrapbookImages.push(newScrapbookImage);
      updatedFields.scrapbookImages = wedding.scrapbookImages; // Send back the whole array or just the new image
    } else {
      return res.status(400).json({ message: 'Invalid imageType specified.' });
    }

    await wedding.save();

    res.status(200).json({ 
      message: `Image for ${imageType} updated successfully`, 
      weddingData: wedding 
    });
  } catch (error) {
    console.error(`Error updating image for ${req.body.imageType || 'unknown type'}:`, error);
    res.status(500).json({ message: 'Error updating image data', error: error.message });
  }
});

// Route to handle RSVP submissions
app.post('/api/rsvp/:customId', async (req, res) => {
  try {
    const { customId } = req.params;
    const rsvpPayload = req.body;

    // Check if wedding data for this customId exists (optional, but good practice)
    const weddingExists = await WeddingData.findOne({ customId });
    if (!weddingExists) {
      return res.status(404).json({ message: `Wedding with ID '${customId}' not found.` });
    }

    const newRsvp = new Rsvp({
      ...rsvpPayload,
      weddingId: customId, // Ensure weddingId from path parameter is used
    });

    const savedRsvp = await newRsvp.save();
    
    // Optionally, you might want to link this RSVP back to the WeddingData document,
    // e.g., by pushing its ID into the wedding.rsvps array.
    // await WeddingData.findOneAndUpdate({ customId }, { $push: { rsvps: savedRsvp._id } });

    res.status(201).json(savedRsvp);
  } catch (err) {
    console.error('Error saving RSVP:', err.message);
    res.status(400).json({ message: 'Error saving RSVP', error: err.message });
  }
});

// Route to verify the setup password for a given wedding customId
app.post('/api/weddings/:customId/verify-setup-password', async (req, res) => {
  try {
    const { customId } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    const wedding = await WeddingData.findOne({ customId }); //.select('+setupPassword'); // Use .select if setupPassword has select: false in schema

    if (!wedding) {
      return res.status(404).json({ message: 'Wedding data not found.' });
    }

    if (!wedding.setupPassword) {
      // This case means a password was never set for this wedding. 
      // You might decide to allow access or require a password to be set first.
      // For now, let's treat it as unauthorized if a password was expected for setup.
      return res.status(401).json({ message: 'Setup password not configured for this wedding.' }); 
    }

    // IMPORTANT: In production, compare hashed passwords.
    // const isMatch = await bcrypt.compare(password, wedding.setupPassword);
    // For now, direct string comparison (NOT FOR PRODUCTION):
    const isMatch = (password === wedding.setupPassword);

    if (isMatch) {
      // In a real app, you might issue a short-lived JWT or session token here for setup access.
      // For simplicity, we'll just return success, and the frontend will manage its auth state.
      res.json({ success: true, message: 'Password verified.' });
    } else {
      res.status(401).json({ success: false, message: 'Invalid password.' });
    }
  } catch (err) {
    console.error('Error verifying setup password:', err.message);
    res.status(500).json({ message: 'Error verifying setup password', error: err.message });
  }
});

// Basic Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 