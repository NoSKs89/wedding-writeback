console.log("--- SERVER.JS VERSION 3 - S3 ENABLED ---"); 
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path'); // Import path module
const serverless = require('serverless-http'); // Added for AWS Lambda

// AWS SDK v3 imports
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses"); // Added for SES
const { v4: uuidv4 } = require('uuid'); // For generating unique file names

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React frontend build directory - REMOVED FOR LAMBDA
// app.use(express.static(path.join(__dirname, '..', 'build')));
// For development, if you place the build folder inside backend, it would be:
// app.use(express.static(path.join(__dirname, 'build')));

// Initialize S3 Client
// Ensure your .env file has AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET_NAME
// These will be Lambda environment variables in AWS
const s3Client = new S3Client({}); // SDK infers region and credentials in Lambda

// Initialize SES Client
// This will also use Lambda environment variables for credentials and region
const sesClient = new SESClient({}); // SDK infers region and credentials in Lambda

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    // In Lambda, you might want to handle this differently than process.exit(1)
    // For now, we'll keep it, but it's something to consider.
    // If the DB connection fails on Lambda cold start, subsequent invocations might also fail.
    // A better approach might be to attempt connection within the handler or use a connection pool manager.
    // For simplicity in this step, we leave it as is, but flag for potential improvement.
    process.exit(1); 
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
      ACL: 'public-read' // Make uploaded object publicly readable
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
    if ((imageType === 'introCouple' || imageType === 'introBackground') && !s3Key) {
      // s3Key might not be strictly needed if we only store the URL for these and don't offer deletion for them via this generic endpoint yet.
      // However, if we want to update them (replace), knowing the old s3Key could be useful to delete the old S3 object.
      // For now, we are just overwriting the URL. If deletion of old main images is needed, this logic would expand.
    }
    if (imageType === 'scrapbook' && !s3Key) {
      return res.status(400).json({ message: 's3Key is required for scrapbook images.' });
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
        fileName: imageUrl, // Storing the full public S3 URL
        s3Key: s3Key,       // Storing the S3 object key
        caption: caption || '',
        uploadedAt: new Date(),
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

// New endpoint to delete an individual scrapbook image
app.delete('/api/weddings/:customId/images/:imageId', async (req, res) => {
  try {
    const { customId, imageId } = req.params;

    const wedding = await WeddingData.findOne({ customId });
    if (!wedding) {
      return res.status(404).json({ message: 'Wedding data not found.' });
    }

    const imageToDelete = wedding.scrapbookImages.id(imageId);
    if (!imageToDelete) {
      return res.status(404).json({ message: 'Scrapbook image not found in this wedding data.' });
    }

    const s3KeyToDelete = imageToDelete.s3Key;

    // Attempt to delete from S3 if s3Key is present
    if (s3KeyToDelete) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: s3KeyToDelete,
        });
        await s3Client.send(deleteCommand);
        console.log(`Successfully deleted ${s3KeyToDelete} from S3.`);
      } catch (s3Error) {
        console.error(`Failed to delete ${s3KeyToDelete} from S3. It might have already been deleted or there was a permission issue. Error: ${s3Error.message}`);
        // Not returning an error to the client, as the primary goal is to remove the DB record.
      }
    }

    // Remove image from MongoDB array
    // imageToDelete.remove(); // .remove() on subdocument instance
    // Mongoose changed this, using pull is more explicit for arrays by _id
    wedding.scrapbookImages.pull({ _id: imageId });

    await wedding.save();

    res.status(200).json({
      message: 'Scrapbook image deleted successfully',
      weddingData: wedding,
    });

  } catch (error) {
    console.error('Error deleting scrapbook image:', error);
    res.status(500).json({ message: 'Error deleting scrapbook image', error: error.message });
  }
});

// New endpoint to clear all scrapbook images for a wedding
app.delete('/api/weddings/:customId/scrapbook-images', async (req, res) => {
  try {
    const { customId } = req.params;
    const wedding = await WeddingData.findOne({ customId });

    if (!wedding) {
      return res.status(404).json({ message: 'Wedding data not found.' });
    }

    // Collect S3 keys and attempt deletion
    if (wedding.scrapbookImages && wedding.scrapbookImages.length > 0) {
      const s3KeysToDelete = wedding.scrapbookImages
        .map(img => img.s3Key)
        .filter(key => key); // Filter out any undefined/null keys

      for (const s3Key of s3KeysToDelete) {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: s3Key,
          });
          await s3Client.send(deleteCommand);
          console.log(`Successfully deleted ${s3Key} from S3 during clear operation.`);
        } catch (s3Error) {
          console.error(`Failed to delete ${s3Key} from S3 during clear operation. It might have already been deleted or there was a permission issue. Error: ${s3Error.message}`);
          // Continue to delete other images and clear from DB even if one S3 delete fails
        }
      }
    }

    wedding.scrapbookImages = []; // Clear the array in MongoDB
    await wedding.save();

    res.status(200).json({
      message: 'Scrapbook images cleared successfully from MongoDB and S3.',
      weddingData: wedding
    });
  } catch (error) {
    console.error('Error clearing scrapbook images:', error);
    res.status(500).json({ message: 'Error clearing scrapbook images', error: error.message });
  }
});

// Route to handle RSVP submissions
app.post('/api/rsvp/:customId', async (req, res) => {
  try {
    const { customId } = req.params;
    const rsvpPayload = req.body;

    // Check if wedding data for this customId exists (optional, but good practice)
    const weddingDetails = await WeddingData.findOne({ customId });
    if (!weddingDetails) {
      return res.status(404).json({ message: `Wedding with ID '${customId}' not found.` });
    }

    const newRsvp = new Rsvp({
      ...rsvpPayload,
      weddingId: customId, // Ensure weddingId from path parameter is used
    });

    const savedRsvp = await newRsvp.save();
    
    // Send email notification via SES
    // IMPORTANT: Replace with your VERIFIED email addresses and customize content
    const toEmailAddress = process.env.RSVP_TO_EMAIL; // e.g., your admin email from Lambda env
    const fromEmailAddress = process.env.RSVP_FROM_EMAIL; // e.g., a 'no-reply@yourdomain.com' VERIFIED with SES

    if (!toEmailAddress || !fromEmailAddress) {
      console.warn('SES email sending skipped: RSVP_TO_EMAIL or RSVP_FROM_EMAIL environment variables not set.');
    } else {
      try {
        let mealInfo = 'N/A';
        if (rsvpPayload.attending && rsvpPayload.mealChoices) {
          if (typeof rsvpPayload.mealChoices === 'string') {
            mealInfo = rsvpPayload.mealChoices;
          } else if (typeof rsvpPayload.mealChoices === 'object') {
            mealInfo = Object.entries(rsvpPayload.mealChoices)
              .map(([meal, quantity]) => `${meal}: ${quantity}`)
              .join(', ');
          }
        }

        const emailSubject = `New RSVP for ${weddingDetails.eventName || customId}: ${rsvpPayload.firstName} ${rsvpPayload.lastName}`;
        const emailBody = `
          <h1>New RSVP Received!</h1>
          <p><strong>Wedding:</strong> ${weddingDetails.eventName || customId}</p>
          <p><strong>Name:</strong> ${rsvpPayload.firstName} ${rsvpPayload.lastName}</p>
          <p><strong>Attending:</strong> ${rsvpPayload.attending ? 'Yes' : 'No'}</p>
          ${rsvpPayload.attending ? `<p><strong>Guests:</strong> ${rsvpPayload.guestCount}</p>` : ''}
          ${rsvpPayload.attending && weddingDetails.isPlated ? `<p><strong>Meal Choices:</strong> ${mealInfo}</p>` : ''}
          <p><strong>Message:</strong> ${rsvpPayload.message || 'No message provided.'}</p>
          <hr>
          <p>RSVP ID: ${savedRsvp._id}</p>
        `;

        const sendEmailCommand = new SendEmailCommand({
          Destination: { ToAddresses: [toEmailAddress] },
          Message: {
            Body: {
              Html: { Charset: "UTF-8", Data: emailBody },
              Text: { Charset: "UTF-8", Data: emailBody.replace(/<[^>]+>/g, '') } // Simple text version
            },
            Subject: { Charset: "UTF-8", Data: emailSubject },
          },
          Source: fromEmailAddress,
          // ReplyToAddresses: [ fromEmailAddress ], // Optional
        });
        
        await sesClient.send(sendEmailCommand);
        console.log('RSVP notification email sent successfully via SES.');

      } catch (emailError) {
        console.error('Failed to send RSVP notification email via SES:', emailError);
        // Do not fail the RSVP submission if email fails, just log the error.
        // The RSVP is already saved to the database.
      }
    }
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

// The "catchall" handler: for any request that doesn't match one above, - REMOVED FOR LAMBDA
// send back React's index.html file.
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
// });

// Basic Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports.handler = serverless(app); // Export the handler for Lambda 