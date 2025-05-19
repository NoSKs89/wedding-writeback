const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Basic Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 