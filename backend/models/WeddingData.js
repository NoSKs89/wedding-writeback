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

const ShareGalleryImageSchema = new mongoose.Schema({
  fileName: String,
  s3Key: String,
  uploadedBy: String,
  uploadedAt: { type: Date, default: Date.now }
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

const RsvpHistorySchema = new mongoose.Schema({
  event: String, // e.g., 'RSVP Submitted', 'RSVP Deleted'
  timestamp: { type: Date, default: Date.now },
  details: String // e.g., 'John Doe (Attending)', 'Jane Smith'
});

const WeddingDataSchema = new mongoose.Schema({
  customId: { type: String, required: true, unique: true, index: true },
  ownerUserId: String,
  eventName: String,
  brideName: String,
  groomName: String,
  weddingDate: Date,
  instanceDisplayName: { type: String, default: null }, // For custom page titles
  // Adjusted field names to potentially align better with frontend usage if desired
  // Or keep original names from testData.json if frontend will adapt
  introBackground: String, // Was introBackgroundUrl in testData.json
  introCouple: String,     // Was introCoupleUrl
  scrapbookImageFolder: String, // Was scrapbookImageFolderUrl
  scrapbookImages: [ImageSchema],
  videoElements: [ImageSchema], // Using ImageSchema since videos have similar metadata structure
  backgroundVideoElements: [ImageSchema], // Using ImageSchema for background videos
  isPlated: Boolean,
  allowKids: { type: Boolean, default: true },
  platedOptions: [MealOptionSchema],
  eventAddress: EventAddressSchema,
  shareGalleryGuid: { type: String, default: null },
  shareGalleryImages: [ShareGalleryImageSchema],
  // For deeply nested or highly variable structures, Mixed can be used.
  // Consider defining full schemas for these if their structure is stable and needs validation.
  settings: mongoose.Schema.Types.Mixed,
  layoutSettings: mongoose.Schema.Types.Mixed, // Legacy, for migration
  layoutSettingsMobile: mongoose.Schema.Types.Mixed, // Legacy, for migration
  layoutSettingsSlot1: mongoose.Schema.Types.Mixed,
  layoutSettingsSlot2: mongoose.Schema.Types.Mixed,
  layoutSettingsSlot3: mongoose.Schema.Types.Mixed,
  layoutSettingsSlot4: mongoose.Schema.Types.Mixed,
  layoutSettingsSlot5: mongoose.Schema.Types.Mixed,
  layoutSettingsMobileSlot1: mongoose.Schema.Types.Mixed,
  layoutSettingsMobileSlot2: mongoose.Schema.Types.Mixed,
  layoutSettingsMobileSlot3: mongoose.Schema.Types.Mixed,
  layoutSettingsMobileSlot4: mongoose.Schema.Types.Mixed,
  layoutSettingsMobileSlot5: mongoose.Schema.Types.Mixed,
  layoutSettingsDesktopPreview: mongoose.Schema.Types.Mixed,
  layoutSettingsMobilePreview: mongoose.Schema.Types.Mixed,
  experienceSettings: mongoose.Schema.Types.Mixed,
  navbarSettings: mongoose.Schema.Types.Mixed,
  invitations: [mongoose.Schema.Types.Mixed],
  rsvps: [mongoose.Schema.Types.Mixed], // This might be better as a separate collection linked by weddingId
  rsvpHistory: [RsvpHistorySchema],
  email: { type: String },
  accountStatus: { type: String, default: 'free' },
  setupPassword: {
    type: String,
    // Production TODO: In a real application, this should be selected: false by default
    // and only populated/managed through secure, specific backend logic.
    // Passwords should ALWAYS be hashed before saving (e.g., using bcryptjs).
  },
  // Email RSVP Alerts settings
  emailRsvpAlerts: {
    enabled: { type: Boolean, default: false },
    emails: [{ type: String }]
  }
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

module.exports = mongoose.model('WeddingData', WeddingDataSchema); 