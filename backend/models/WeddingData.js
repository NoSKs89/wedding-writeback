const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  id: String,
  fileName: String,
  s3Key: String,
  caption: String,
  uploadedAt: Date
});

const MealOptionSchema = new mongoose.Schema({
  optionId: String,
  name: String,
  description: String,
  dietaryTags: [String]
});

const EventAddressSchema = new mongoose.Schema({
  venueName: String,
  street: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,
  mapsLink: String
});

const WeddingDataSchema = new mongoose.Schema({
  customId: { type: String, required: true, unique: true, index: true },
  ownerUserId: String,
  eventName: String,
  brideName: String,
  groomName: String,
  weddingDate: Date,
  // Adjusted field names to potentially align better with frontend usage if desired
  // Or keep original names from testData.json if frontend will adapt
  introBackground: String, // Was introBackgroundUrl in testData.json
  introCouple: String,     // Was introCoupleUrl
  scrapbookImageFolder: String, // Was scrapbookImageFolderUrl
  scrapbookImages: [ImageSchema],
  isPlated: Boolean,
  platedOptions: [MealOptionSchema],
  eventAddress: EventAddressSchema,
  // For deeply nested or highly variable structures, Mixed can be used.
  // Consider defining full schemas for these if their structure is stable and needs validation.
  settings: mongoose.Schema.Types.Mixed,
  layoutSettings: mongoose.Schema.Types.Mixed,
  invitations: [mongoose.Schema.Types.Mixed],
  rsvps: [mongoose.Schema.Types.Mixed], // This might be better as a separate collection linked by weddingId
  setupPassword: {
    type: String,
    // Production TODO: In a real application, this should be selected: false by default
    // and only populated/managed through secure, specific backend logic.
    // Passwords should ALWAYS be hashed before saving (e.g., using bcryptjs).
  }
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

module.exports = mongoose.model('WeddingData', WeddingDataSchema); 