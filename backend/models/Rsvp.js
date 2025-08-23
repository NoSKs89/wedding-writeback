const mongoose = require('mongoose');

const RsvpSchema = new mongoose.Schema({
  weddingId: { type: String, required: true, index: true }, // To associate with a WeddingData customId
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  attending: { type: Boolean, required: true },
  guestCount: { type: Number, default: 0 },
  adultCount: { type: Number, default: 0 },
  kidsCount: { type: Number, default: 0 },
  bringingKids: { type: Boolean, default: false },
  message: String,
  // mealChoices can be a String (single choice), or an object (multiple choices with quantities)
  // Using Mixed to accommodate both, or you could have separate fields / more complex logic.
  mealChoices: mongoose.Schema.Types.Mixed,
  submittedAt: {
    type: Date,
    default: Date.now
  }
  // You might want to add guestDetails array here if you need to store per-guest info like in your testData.json's rsvps array
  // For now, keeping it simpler based on the direct payload from RSVPForm.tsx
});

module.exports = mongoose.model('Rsvp', RsvpSchema); 