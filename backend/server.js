console.log("--- NATIVE LAMBDA HANDLER - Initializing ---");

const mongoose = require('mongoose');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Models (ensure paths are correct if handler.js is in a different location than server.js was)
const Item = require('./models/Item');
const WeddingData = require('./models/WeddingData');
const Rsvp = require('./models/Rsvp');

// Environment Variables (should be set in Lambda configuration)
const MONGO_URI = process.env.MONGO_URI;
const S3_REGION = process.env.AWS_REGION_S3 || "us-east-2";
const SES_REGION = process.env.AWS_REGION_SES || "us-east-2";
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const RSVP_TO_EMAIL = process.env.RSVP_TO_EMAIL;
const RSVP_FROM_EMAIL = process.env.RSVP_FROM_EMAIL;

// --- Allowed Origins for CORS ---
const ALLOWED_ORIGINS = [
  'http://localhost:3000',          // Local development for frontend
  'https://weddingwriteback.com',    // Production frontend
  // Add any other origins you need to support, e.g., staging environments
];

// --- AWS SDK Clients ---
const s3Client = new S3Client({ region: S3_REGION });
const sesClient = new SESClient({ region: SES_REGION });

// --- Mongoose Debug (keep it for now) ---
mongoose.set('debug', function (collectionName, methodName, ...methodArgs) {
  const safeArgs = methodArgs.map(arg => {
    try { return JSON.stringify(arg); } catch (e) { return '[Unstringifiable Argument]'; }
  });
  const msg = `Mongoose (Native Handler): ${collectionName}.${methodName}(${safeArgs.join(', ')})`;
  console.log(msg);
});
console.log('[NATIVE_LAMBDA_INIT] Mongoose debug mode has been set.');

// --- Database Connection ---
let mongooseConnection = null;
const connectToDatabase = async () => {
  if (mongooseConnection && mongoose.connection.readyState === 1) {
    console.log('[DB_CONNECT_NATIVE] Using existing Mongoose connection.');
    return mongooseConnection;
  }
  try {
    console.log('[DB_CONNECT_NATIVE] Attempting new Mongoose connection...');
    console.log(`[DB_CONNECT_NATIVE] MONGO_URI: ${MONGO_URI ? MONGO_URI.substring(0, MONGO_URI.indexOf('@') > 0 ? MONGO_URI.indexOf('@') : 30) + "..." : "MONGO_URI NOT SET"}`);
    mongooseConnection = await mongoose.connect(MONGO_URI); // Add options if needed for your Mongoose version
    console.log('[DB_CONNECT_NATIVE] Mongoose connected successfully.');
    return mongooseConnection;
  } catch (error) {
    console.error('[DB_CONNECT_NATIVE] Mongoose connection error:', error);
    mongooseConnection = null; // Reset on error
    throw error; // Propagate error to be handled by the caller
  }
};

// --- Helper for API Gateway Responses ---
const createResponse = (statusCode, body, requestOrigin, additionalHeaders = {}) => {
  const baseHeaders = {
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent", // Added X-Amz-User-Agent
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE,PATCH", // Added PATCH
    ...additionalHeaders,
  };

  if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
    baseHeaders["Access-Control-Allow-Origin"] = requestOrigin;
    baseHeaders["Access-Control-Allow-Credentials"] = "true"; // Must be a string "true"
  } else {
    // For non-whitelisted origins or if no origin is present, use a wildcard.
    // Credentials cannot be true with a wildcard origin.
    baseHeaders["Access-Control-Allow-Origin"] = "*";
    // If "Access-Control-Allow-Credentials" was true by default from additionalHeaders, ensure it's removed or false for wildcard.
    // For simplicity, we ensure it's not true. If it's in additionalHeaders as true, this logic doesn't override, which could be an edge case.
    // However, standard calls won't put it there.
  }

  return {
    statusCode,
    headers: baseHeaders,
    body: JSON.stringify(body),
  };
};

// --- Main Lambda Handler ---
exports.handler = async (event, context) => {
  // context.callbackWaitsForEmptyEventLoop = true; // Default is true, usually fine. If false, connections might close prematurely.

  console.log('[HANDLER] Event Received:', JSON.stringify(event, null, 2)); // Log the event for debugging
  const requestOrigin = event.headers?.origin || event.headers?.Origin; // Get request origin
  console.log(`[HANDLER] Request Origin Header: ${requestOrigin}`);

  const httpMethod = event.requestContext.http.method;
  let routePath = event.requestContext.http.path;
  const stage = event.requestContext.stage;
  if (routePath.startsWith(`/${stage}`)) {
    routePath = routePath.substring(stage.length + 1); // Remove /stage, e.g. /dev/api/hello -> /api/hello
  }
  if (!routePath.startsWith('/')) {
    routePath = '/' + routePath;
  }

  console.log(`[HANDLER] Determined routePath for matching: ${routePath}`);
  console.log(`[HANDLER] HTTP Method for matching: ${httpMethod}`);

  // --- Handle API Routes ---
  if (routePath.startsWith('/api/')) {
    // Ensure database connection FOR API calls
    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error('[HANDLER] Critical: Failed to connect to database for API request.', dbError);
      return createResponse(500, { message: "Internal Server Error - Database connection failed" }, requestOrigin);
    }

    // --- Handle CORS Preflight OPTIONS requests globally for API ---
    if (httpMethod === 'OPTIONS') {
      console.log(`[HANDLER] Responding to API OPTIONS preflight for ${routePath}`)
      return createResponse(200, {}, requestOrigin); // Return 200 OK with CORS headers from createResponse
    }
    // --- End API CORS Preflight --- 

    const pathParametersFromEvent = event.pathParameters || {};
    let body = {};

    if (event.body && typeof event.body === 'string') {
      try {
        body = JSON.parse(event.body);
      } catch (parseError) {
        console.error('[HANDLER] Error parsing JSON body:', parseError);
        return createResponse(400, { message: "Invalid JSON format in request body." }, requestOrigin);
      }
    } else if (event.body) {
      body = event.body;
    }

    try {
      // Simple GET /api/hello
      if (httpMethod === "GET" && routePath === "/api/hello") {
        return createResponse(200, { message: 'Hello from the native Lambda backend!' }, requestOrigin);
      }

      // GET /api/items
      if (httpMethod === "GET" && routePath === "/api/items") {
          const items = await Item.find();
          return createResponse(200, items, requestOrigin);
      }

      // POST /api/items
      if (httpMethod === "POST" && routePath === "/api/items") {
          const newItem = new Item({ name: body.name });
          const item = await newItem.save();
          return createResponse(201, item, requestOrigin);
      }

      // GET /api/weddings/:customId
      const getWeddingByIdMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)$/);
      if (httpMethod === "GET" && getWeddingByIdMatch) {
          const customId = getWeddingByIdMatch[1];
          console.log(`[ROUTE /api/weddings/:customId] Request for ${customId}. Mongoose readyState: ${mongoose.connection.readyState}`);
          const wedding = await WeddingData.findOne({ customId });
          if (!wedding) {
              return createResponse(404, { message: 'Wedding data not found' }, requestOrigin);
          }
          
          // Ensure allowKids field is present with default value if missing
          const weddingData = wedding.toObject();
          if (weddingData.allowKids === undefined) {
              weddingData.allowKids = true; // Default value
          }
          
          return createResponse(200, weddingData, requestOrigin);
      }    

      // POST /api/weddings
      if (httpMethod === "POST" && routePath === "/api/weddings") {
          const weddingPayload = body;
          if (!weddingPayload.customId) {
              return createResponse(400, { message: 'customId is required' }, requestOrigin);
          }

          // Hash password if provided
          if (weddingPayload.setupPassword) {
              const salt = await bcrypt.genSalt(10);
              weddingPayload.setupPassword = await bcrypt.hash(weddingPayload.setupPassword, salt);
          }
          
          // Handle special debug case for erickson2025
          if (weddingPayload.customId === 'erickson2025' && weddingPayload.email === '1' && body.setupPassword === '1') {
             // The password '1' was already hashed above if provided in body.setupPassword
             // Ensure accountStatus is set if this is the erickson2025 debug case
             weddingPayload.accountStatus = 'free';
          }

          const wedding = await WeddingData.findOneAndUpdate(
              { customId: weddingPayload.customId }, 
              { 
                ...weddingPayload,
                // Explicitly set email and accountStatus if they are part of the payload
                // or rely on defaults/previous values if not provided.
                ...(weddingPayload.email && { email: weddingPayload.email }),
                ...(weddingPayload.accountStatus && { accountStatus: weddingPayload.accountStatus })
              },
              { new: true, upsert: true, runValidators: true }
          );
          return createResponse(wedding ? 201 : 400, wedding || { message: "Failed to create/update wedding" }, requestOrigin);
      }

      // GET /api/weddings/:customId/layout-settings
      const getLayoutSettingsMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/layout-settings$/);
      if (httpMethod === "GET" && getLayoutSettingsMatch) {
          const customId = getLayoutSettingsMatch[1];
          const view = event.queryStringParameters?.view || 'desktop'; // Default to 'desktop'
          const fieldToSelect = view === 'mobile' ? 'layoutSettingsMobile' : 'layoutSettings';
          
          console.log(`[GET /layout-settings] customId: ${customId}, view: ${view}, selecting: ${fieldToSelect}`);

          const wedding = await WeddingData.findOne({ customId }).select(`${fieldToSelect} customId`);
          if (!wedding) return createResponse(404, { message: 'Wedding data not found' }, requestOrigin);
          
          return createResponse(200, wedding[fieldToSelect] || {}, requestOrigin);
      }

      // GET /api/weddings/:customId/layoutSettings/:viewType
      const getLayoutSettingsWithViewMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/layoutSettings\/(desktop|mobile)$/);
      if (httpMethod === "GET" && getLayoutSettingsWithViewMatch) {
          const customId = getLayoutSettingsWithViewMatch[1];
          const viewType = getLayoutSettingsWithViewMatch[2]; // 'desktop' or 'mobile'
          
          // Get slotNumber from query parameters
          const slotNumberParam = event.queryStringParameters?.slotNumber;
          const slotNumber = slotNumberParam ? parseInt(slotNumberParam, 10) : null;

          console.log(`[GET /layoutSettings/:viewType] customId: ${customId}, view: ${viewType}, slotNumber: ${slotNumber}`);

          if (!slotNumber || ![1, 2, 3, 4, 5].includes(slotNumber)) {
              return createResponse(400, { message: 'A valid slotNumber (1-5) is required as a query parameter.' }, requestOrigin);
          }
          
          const fieldPrefix = viewType === 'mobile' ? 'layoutSettingsMobileSlot' : 'layoutSettingsSlot';
          const fieldToSelect = `${fieldPrefix}${slotNumber}`;
          const legacyField = viewType === 'mobile' ? 'layoutSettingsMobile' : 'layoutSettings';
          
          console.log(`[GET /layoutSettings/:viewType] Selecting field: ${fieldToSelect}, with fallback to ${legacyField}`);

          const wedding = await WeddingData.findOne({ customId }).select(`${fieldToSelect} ${legacyField} customId`);
          if (!wedding) {
              return createResponse(404, { message: 'Wedding data not found for layout settings.' }, requestOrigin);
          }
          
          let settingsData = wedding[fieldToSelect];
          // If the slot data is empty/null/undefined, and we are looking at slot 1, consider falling back to the legacy field for migration.
          if (!settingsData && slotNumber === 1 && wedding[legacyField]) {
            console.log(`[GET /layoutSettings/:viewType] Slot 1 is empty, falling back to legacy field ${legacyField}.`);
            settingsData = wedding[legacyField];
          } else if (!settingsData) {
            settingsData = {};
          }
          
          // levaStore expects the response to have a 'settings' key containing the actual layout object
          return createResponse(200, { settings: settingsData }, requestOrigin);
      }

      // POST /api/weddings/:customId/layout-settings/:viewType
      const postLayoutSettingsWithViewMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/layoutSettings\/(desktop|mobile)$/);
      if (httpMethod === "POST" && postLayoutSettingsWithViewMatch) {
          const customId = postLayoutSettingsWithViewMatch[1];
          const viewType = postLayoutSettingsWithViewMatch[2]; // 'desktop' or 'mobile'
          
          // The body is expected to be { settings: { ... }, slotNumber: X }
          const { settings: newLayoutSettings, slotNumber } = body; 

          if (typeof newLayoutSettings !== 'object' || newLayoutSettings === null) {
              return createResponse(400, { message: 'Invalid layout settings. Expected an object under a top-level \'settings\' key.' }, requestOrigin);
          }
          if (!slotNumber || ![1, 2, 3, 4, 5].includes(slotNumber)) {
              return createResponse(400, { message: 'Invalid or missing slotNumber. Expected a number from 1 to 5.' }, requestOrigin);
          }

          const fieldPrefix = viewType === 'mobile' ? 'layoutSettingsMobileSlot' : 'layoutSettingsSlot';
          const fieldToUpdate = `${fieldPrefix}${slotNumber}`;

          console.log(`[POST /layoutSettings/:viewType] customId: ${customId}, view: ${viewType}, SLOT: ${slotNumber}, updating field: ${fieldToUpdate}`);
          
          const updateQuery = { $set: { [fieldToUpdate]: newLayoutSettings } };
          const wedding = await WeddingData.findOneAndUpdate(
              { customId }, 
              updateQuery,
              { new: true, runValidators: true, select: `${fieldToUpdate} customId` }
          );
          if (!wedding) return createResponse(404, { message: 'Wedding data not found for layout update.' }, requestOrigin);
          
          return createResponse(200, { message: `Layout settings for ${viewType} view (Slot ${slotNumber}) saved.`, [fieldToUpdate]: wedding[fieldToUpdate] }, requestOrigin);
      }
      
      // GET /api/weddings/:customId/layoutSettings/preview/:viewType
      const getPreviewLayoutSettingsMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/layoutSettings\/preview\/(desktop|mobile)$/);
      if (httpMethod === "GET" && getPreviewLayoutSettingsMatch) {
          const customId = getPreviewLayoutSettingsMatch[1];
          const viewType = getPreviewLayoutSettingsMatch[2];
          const fieldToSelect = viewType === 'mobile' ? 'layoutSettingsMobilePreview' : 'layoutSettingsDesktopPreview';

          console.log(`[GET /layoutSettings/preview/:viewType] customId: ${customId}, view: ${viewType}, selecting: ${fieldToSelect}`);

          const wedding = await WeddingData.findOne({ customId }).select(`${fieldToSelect} customId`);
          if (!wedding) {
              return createResponse(404, { message: 'Wedding data not found for preview layout settings.' }, requestOrigin);
          }
          
          const settingsData = wedding[fieldToSelect] || {};
          return createResponse(200, { settings: settingsData }, requestOrigin);
      }

      // POST /api/weddings/:customId/layoutSettings/preview/:viewType
      const postPreviewLayoutSettingsMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/layoutSettings\/preview\/(desktop|mobile)$/);
      if (httpMethod === "POST" && postPreviewLayoutSettingsMatch) {
          const customId = postPreviewLayoutSettingsMatch[1];
          const viewType = postPreviewLayoutSettingsMatch[2];
          const { settings: newLayoutSettings } = body;

          if (typeof newLayoutSettings !== 'object' || newLayoutSettings === null) {
              return createResponse(400, { message: 'Invalid layout settings. Expected an object under a top-level \'settings\' key.' }, requestOrigin);
          }

          const fieldToUpdate = viewType === 'mobile' ? 'layoutSettingsMobilePreview' : 'layoutSettingsDesktopPreview';
          console.log(`[POST /layoutSettings/preview/:viewType] customId: ${customId}, view: ${viewType}, updating field: ${fieldToUpdate}`);
          
          const updateQuery = { $set: { [fieldToUpdate]: newLayoutSettings } };
          const wedding = await WeddingData.findOneAndUpdate(
              { customId }, 
              updateQuery,
              { new: true, runValidators: true, select: `${fieldToUpdate} customId` }
          );

          if (!wedding) return createResponse(404, { message: 'Wedding data not found for preview layout update.' }, requestOrigin);
          
          return createResponse(200, { message: `Preview layout for ${viewType} view saved.` });
      }
      
      // GET /api/weddings/:customId/experience-settings
      const getExperienceSettingsMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/experience-settings$/);
      if (httpMethod === "GET" && getExperienceSettingsMatch) {
          const customId = getExperienceSettingsMatch[1];
          console.log(`[GET /experience-settings] customId: ${customId}`);
          const wedding = await WeddingData.findOne({ customId }).select('experienceSettings customId');
          if (!wedding) return createResponse(404, { message: 'Wedding data not found for experience settings' }, requestOrigin);
          // Send back the settings, or an empty object if not found, to align with frontend expectation
          return createResponse(200, { data: wedding.experienceSettings || null }, requestOrigin);
      }

      // POST /api/weddings/:customId/experience-settings
      const postExperienceSettingsMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/experience-settings$/);
      if (httpMethod === "POST" && postExperienceSettingsMatch) {
          const customId = postExperienceSettingsMatch[1];
          const newExperienceSettings = body; // The whole body is the settings object
          console.log(`[POST /experience-settings] customId: ${customId}`);

          if (typeof newExperienceSettings !== 'object' || newExperienceSettings === null) {
              return createResponse(400, { message: 'Invalid experience settings. Expected an object.' }, requestOrigin);
          }
          
          const updateQuery = { $set: { experienceSettings: newExperienceSettings } };
          const wedding = await WeddingData.findOneAndUpdate(
              { customId }, 
              updateQuery,
              { new: true, runValidators: true, select: 'experienceSettings customId' }
          );
          if (!wedding) return createResponse(404, { message: 'Wedding data not found for experience settings update.' }, requestOrigin);
          
          return createResponse(200, { message: 'Experience settings saved.', data: wedding.experienceSettings }, requestOrigin);
      }
      
      // POST /api/rsvp
      if (httpMethod === "POST" && routePath === "/api/rsvp") {
          console.log('[ROUTE /api/rsvp] Received RSVP submission:', body);
          const { weddingId, firstName, lastName, email, attending, guestCount, adultCount, kidsCount, bringingKids, message, mealChoices, isPlated, platedOptions } = body;
          
          if (!weddingId || !firstName || !lastName || typeof attending !== 'boolean') {
              return createResponse(400, { message: 'Missing required RSVP fields.' }, requestOrigin);
          }
          
          const wedding = await WeddingData.findOne({ customId: weddingId });
          if (!wedding) {
              return createResponse(404, { message: 'Wedding not found for this RSVP.' }, requestOrigin);
          }

          // --- Duplicate RSVP Check ---
          if (email) {
            const normalizedEmail = email.toLowerCase();
            const isDuplicate = wedding.rsvps && wedding.rsvps.some(rsvp => 
                rsvp.firstName && rsvp.firstName.toLowerCase() === firstName.toLowerCase() &&
                rsvp.lastName && rsvp.lastName.toLowerCase() === lastName.toLowerCase() &&
                rsvp.email && rsvp.email.toLowerCase() === normalizedEmail
            );

            if (isDuplicate) {
                console.log(`[ROUTE /api/rsvp] Duplicate RSVP detected for ${firstName} ${lastName} with email ${email}`);
                return createResponse(409, { message: `An RSVP for ${firstName} ${lastName} with this email has already been submitted.` }, requestOrigin);
            }
          }
          // --- End Duplicate Check ---

          const newRsvp = {
            rsvpId: uuidv4(),
            firstName,
            lastName,
            email: email || null, // Ensure email is saved
            attending,
            guestCount: attending ? guestCount : 0,
            adultCount: attending && bringingKids ? adultCount : (attending ? guestCount : 0),
            kidsCount: attending && bringingKids ? kidsCount : 0,
            bringingKids: attending ? bringingKids : false,
            message,
            mealChoices: attending ? mealChoices : {},
            submittedAt: new Date(),
            isModified: false,
            lastModifiedAt: new Date(),
          };

          // Using $push to add the new RSVP to the array
          console.log(`[ROUTE /api/rsvp] Attempting to update wedding ${weddingId} with new RSVP:`, {
            rsvpId: newRsvp.rsvpId,
            firstName: newRsvp.firstName,
            lastName: newRsvp.lastName,
            attending: newRsvp.attending,
            guestCount: newRsvp.guestCount,
            adultCount: newRsvp.adultCount,
            kidsCount: newRsvp.kidsCount,
            bringingKids: newRsvp.bringingKids
          });
          
          const updateResult = await WeddingData.updateOne(
              { customId: weddingId },
              { 
                  $push: { 
                      rsvps: newRsvp,
                      rsvpHistory: {
                          event: 'RSVP Submitted',
                          details: `${firstName} ${lastName} (${attending ? 'Attending' : 'Not Attending'})${attending && bringingKids ? ` - ${adultCount} adults, ${kidsCount} kids` : attending ? ` - ${guestCount} guests` : ''}`
                      }
                  } 
              }
          );

          console.log(`[ROUTE /api/rsvp] Update result:`, {
            matchedCount: updateResult.matchedCount,
            modifiedCount: updateResult.modifiedCount,
            upsertedCount: updateResult.upsertedCount,
            acknowledged: updateResult.acknowledged
          });

          if (updateResult.modifiedCount === 0) {
              // This could happen if the document was not found, but we already checked for that.
              // More likely, there was an issue with the update operation itself.
              console.error(`[ROUTE /api/rsvp] Failed to add RSVP for weddingId: ${weddingId}`);
              console.error(`[ROUTE /api/rsvp] Update result details:`, updateResult);
              return createResponse(500, { message: "An internal error occurred while saving your RSVP." }, requestOrigin);
          }

          console.log(`[ROUTE /api/rsvp] Successfully added RSVP for ${firstName} ${lastName} to wedding ${weddingId}.`);
          
          // Optionally send an email notification after successful submission
          // (Consider moving this to a separate, non-blocking process if it becomes slow)
          if (RSVP_TO_EMAIL && RSVP_FROM_EMAIL) {
            console.log(`[ROUTE /api/rsvp] Attempting to send email notification to ${RSVP_TO_EMAIL} from ${RSVP_FROM_EMAIL}`);
            try {
              const eventName = wedding.eventName || 'Wedding Event'; // Add fallback
              const emailParams = {
                Destination: { ToAddresses: [RSVP_TO_EMAIL] },
                Message: {
                  Body: {
                    Text: {
                      Charset: "UTF-8",
                      Data: `New RSVP for ${eventName}:\n\nName: ${firstName} ${lastName}\nEmail: ${email || 'Not provided'}\nAttending: ${attending ? 'Yes' : 'No'}\nGuests: ${guestCount}${bringingKids && attending ? ` (${adultCount} adults, ${kidsCount} kids)` : ''}\nMessage: ${message || 'None'}\nMeal Choices: ${JSON.stringify(mealChoices, null, 2)}`
                    },
                    Html: {
                      Charset: "UTF-8",
                      Data: `<h3>New RSVP for ${eventName}</h3>
                             <p><strong>Name:</strong> ${firstName} ${lastName}</p>
                             <p><strong>Email:</strong> ${email || 'Not provided'}</p>
                             <p><strong>Attending:</strong> ${attending ? 'Yes' : 'No'}</p>
                             <p><strong>Guests:</strong> ${guestCount}${bringingKids && attending ? ` (${adultCount} adults, ${kidsCount} kids)` : ''}</p>
                             <p><strong>Message:</strong> ${message || 'None'}</p>
                             <p><strong>Meal Choices:</strong></p>
                             <pre>${JSON.stringify(mealChoices, null, 2)}</pre>`
                    }
                  },
                  Subject: {
                    Charset: "UTF-8",
                    Data: `New RSVP from ${firstName} ${lastName} for ${eventName}`
                  }
                },
                Source: RSVP_FROM_EMAIL,
              };
              await sesClient.send(new SendEmailCommand(emailParams));
              console.log(`[ROUTE /api/rsvp] Email notification sent successfully to ${RSVP_TO_EMAIL}.`);
            } catch (emailError) {
              console.error("[ROUTE /api/rsvp] Error sending email notification:", emailError);
              console.error("[ROUTE /api/rsvp] Email error details:", {
                errorMessage: emailError.message,
                errorCode: emailError.Code,
                errorType: emailError.name,
                rsvpToEmail: RSVP_TO_EMAIL,
                rsvpFromEmail: RSVP_FROM_EMAIL
              });
              // Do not fail the whole request if email fails, just log it.
            }
          } else {
            console.log(`[ROUTE /api/rsvp] Email notification skipped - RSVP_TO_EMAIL: ${RSVP_TO_EMAIL}, RSVP_FROM_EMAIL: ${RSVP_FROM_EMAIL}`);
          }

          return createResponse(201, newRsvp, requestOrigin);
      }

      // DELETE /api/weddings/:customId/rsvps/:rsvpId
      const deleteRsvpMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/rsvps\/([a-zA-Z0-9_-]+)$/);
      if (httpMethod === 'DELETE' && deleteRsvpMatch) {
          const customId = deleteRsvpMatch[1];
          const rsvpIdToDelete = deleteRsvpMatch[2];

          console.log(`[DELETE /rsvps] Attempting to delete RSVP ${rsvpIdToDelete} from wedding ${customId}`);

          const wedding = await WeddingData.findOne({ customId: customId });
          if (!wedding) {
              return createResponse(404, { message: 'Wedding not found.' }, requestOrigin);
          }

          const rsvpToDelete = wedding.rsvps.find(r => r.rsvpId === rsvpIdToDelete);
          if (!rsvpToDelete) {
              return createResponse(404, { message: 'RSVP not found.' }, requestOrigin);
          }

          const updateResult = await WeddingData.updateOne(
              { customId: customId },
              {
                  $pull: { rsvps: { rsvpId: rsvpIdToDelete } },
                  $push: {
                      rsvpHistory: {
                          event: 'RSVP Deleted',
                          details: `${rsvpToDelete.firstName} ${rsvpToDelete.lastName}`
                      }
                  }
              }
          );

          if (updateResult.modifiedCount === 0) {
              return createResponse(500, { message: 'Failed to delete RSVP.' }, requestOrigin);
          }
          
          const updatedWedding = await WeddingData.findOne({ customId: customId });

          return createResponse(200, { message: 'RSVP deleted successfully.', wedding: updatedWedding }, requestOrigin);
      }

      // POST /api/s3/presigned-url
      const presignedUrlMatch = routePath.match(/^\/api\/s3\/presigned-url$/);
      if (httpMethod === "POST" && presignedUrlMatch) {
          const { fileName, fileType, weddingId, imageType } = body;
          if (!fileName || !fileType || !weddingId || !imageType) {
              return createResponse(400, { message: 'fileName, fileType, weddingId, and imageType are required.' }, requestOrigin);
          }
          let s3KeyPrefix = '';
          switch (imageType) {
              case 'introCouple': case 'introBackground': s3KeyPrefix = `${weddingId}/main/`; break;
              case 'scrapbook': s3KeyPrefix = `${weddingId}/scrapbook/`; break;
              case 'shareGallery': s3KeyPrefix = `${weddingId}/share-gallery/`; break;
              case 'navbar': s3KeyPrefix = `${weddingId}/navbar/`; break;
              default: return createResponse(400, { message: 'Invalid imageType.' }, requestOrigin);
          }
          const uniqueFileName = `${s3KeyPrefix}${uuidv4()}-${fileName.replace(/\s+/g, '_')}`;
          const command = new PutObjectCommand({ Bucket: AWS_S3_BUCKET_NAME, Key: uniqueFileName, ContentType: fileType });
          const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
          const publicUrl = `https://${AWS_S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${uniqueFileName}`;
          return createResponse(200, { presignedUrl, publicUrl, key: uniqueFileName }, requestOrigin);
      }

      // POST /api/weddings/:customId/images
      const postImageMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/images$/);
      if (httpMethod === "POST" && postImageMatch) {
          const customId = postImageMatch[1];
          const { imageUrl, caption, s3Key, imageType } = body;
          if (!imageUrl || !imageType) return createResponse(400, { message: 'imageUrl and imageType are required.' }, requestOrigin);
          if (imageType === 'scrapbook' && !s3Key) return createResponse(400, { message: 's3Key required for scrapbook images.' }, requestOrigin);

          const wedding = await WeddingData.findOne({ customId });
          if (!wedding) return createResponse(404, { message: 'Wedding data not found for image update.' }, requestOrigin);

          if (imageType === 'introCouple') wedding.introCouple = imageUrl;
          else if (imageType === 'introBackground') wedding.introBackground = imageUrl;
          else if (imageType === 'scrapbook') {
              wedding.scrapbookImages.push({ fileName: imageUrl, s3Key, caption: caption || '', uploadedAt: new Date() });
          } else return createResponse(400, { message: 'Invalid imageType for image post.' }, requestOrigin);
          
          await wedding.save();
          return createResponse(200, { message: `Image for ${imageType} saved.`, weddingData: wedding }, requestOrigin);
      }

      // DELETE /api/weddings/:customId/images/:imageId
      const deleteImageMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/images\/([a-zA-Z0-9_.-]+)$/);
      if (httpMethod === "DELETE" && deleteImageMatch) {
          const customId = deleteImageMatch[1];
          const imageId = deleteImageMatch[2];
          const wedding = await WeddingData.findOne({ customId });
          if (!wedding) return createResponse(404, { message: 'Wedding data not found for image delete.' }, requestOrigin);
          
          const imageToDelete = wedding.scrapbookImages.id(imageId);
          if (!imageToDelete) return createResponse(404, { message: 'Scrapbook image not found by ID.' }, requestOrigin);
          
          if (imageToDelete.s3Key) {
              try {
                  await s3Client.send(new DeleteObjectCommand({ Bucket: AWS_S3_BUCKET_NAME, Key: imageToDelete.s3Key }));
                  console.log(`S3 Delete: ${imageToDelete.s3Key}`);
              } catch (s3Error) { console.error(`S3 Delete Fail: ${imageToDelete.s3Key}`, s3Error); }
          }
          wedding.scrapbookImages.pull({ _id: imageId });
          await wedding.save();
          return createResponse(200, { message: 'Scrapbook image deleted.', weddingData: wedding }, requestOrigin);
      }

      // DELETE /api/weddings/:customId/scrapbook-images
      const clearScrapbookMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/scrapbook-images$/);
      if (httpMethod === "DELETE" && clearScrapbookMatch) {
          const customId = clearScrapbookMatch[1];
          const wedding = await WeddingData.findOne({ customId });
          if (!wedding) return createResponse(404, { message: 'Wedding data not found for scrapbook clear.' }, requestOrigin);
          if (wedding.scrapbookImages && wedding.scrapbookImages.length > 0) {
              for (const img of wedding.scrapbookImages) {
                  if (img.s3Key) {
                      try {
                          await s3Client.send(new DeleteObjectCommand({ Bucket: AWS_S3_BUCKET_NAME, Key: img.s3Key }));
                          console.log(`S3 Clear: ${img.s3Key}`);
                      } catch (s3Error) { console.error(`S3 Clear Fail: ${img.s3Key}`, s3Error); }
                  }
              }
          }
          wedding.scrapbookImages = [];
          await wedding.save();
          return createResponse(200, { message: 'All scrapbook images cleared.', weddingData: wedding }, requestOrigin);
      }
      
      // --- Share Gallery Admin Endpoints ---

      // GET /api/weddings/:customId/share-gallery (For Setup Page)
      const getShareGalleryMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/share-gallery$/);
      if (httpMethod === "GET" && getShareGalleryMatch) {
          const customId = getShareGalleryMatch[1];
          console.log(`[GET /share-gallery] Admin page loading for weddingId: ${customId}`);
          
          const wedding = await WeddingData.findOne({ customId });
          if (!wedding) {
              console.log(`[GET /share-gallery] Wedding data NOT FOUND for customId: ${customId}.`);
              return createResponse(404, { message: 'Wedding data not found.' }, requestOrigin);
          }

          console.log(`[GET /share-gallery] Found wedding data. The shareGalleryGuid from DB is: '${wedding.shareGalleryGuid}'.`);
          // The following log will show the whole document fetched from MongoDB.
          // If 'shareGalleryGuid' is not in this log after you regenerate it, the server is running with an old data model and needs a restart/redeploy.
          console.log(`[GET /share-gallery] Full wedding document from DB:`, wedding);

          // Send back the GUID if it exists, otherwise null. Do not create it here.
          return createResponse(200, { 
              galleryGuid: wedding.shareGalleryGuid || null,
              images: wedding.shareGalleryImages || [] 
          }, requestOrigin);
      }

      // POST /api/weddings/:customId/share-gallery/generate-guid (For Setup Page - First time generation)
      const generateGuidMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/share-gallery\/generate-guid$/);
      if (httpMethod === "POST" && generateGuidMatch) {
          const customId = generateGuidMatch[1];
          const wedding = await WeddingData.findOne({ customId });
          if (!wedding) return createResponse(404, { message: 'Wedding data not found.' }, requestOrigin);
          
          if (wedding.shareGalleryGuid) {
              return createResponse(409, { message: 'A gallery link already exists. Use regenerate to create a new one.' }, requestOrigin);
          }

          const newGuid = uuidv4();
          wedding.shareGalleryGuid = newGuid;
          await wedding.save();
          
          return createResponse(201, { newGuid: wedding.shareGalleryGuid }, requestOrigin);
      }

      // POST /api/weddings/:customId/share-gallery/regenerate-guid (For Setup Page)
      const regenerateGuidMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/share-gallery\/regenerate-guid$/);
      if (httpMethod === "POST" && regenerateGuidMatch) {
          const customId = regenerateGuidMatch[1];
          
          // First, find the wedding to get existing images for deletion
          const weddingForImageDeletion = await WeddingData.findOne({ customId });
          if (!weddingForImageDeletion) return createResponse(404, { message: 'Wedding data not found.' }, requestOrigin);

          // If there are existing images, delete them from S3
          if (weddingForImageDeletion.shareGalleryImages && weddingForImageDeletion.shareGalleryImages.length > 0) {
              console.log(`[Regenerate GUID] Deleting ${weddingForImageDeletion.shareGalleryImages.length} images from share gallery for ${customId}.`);
              for (const img of weddingForImageDeletion.shareGalleryImages) {
                  if (img.s3Key) {
                      try {
                          await s3Client.send(new DeleteObjectCommand({ Bucket: AWS_S3_BUCKET_NAME, Key: img.s3Key }));
                          console.log(`S3 Share Gallery (GUID Regen) Delete Success: ${img.s3Key}`);
                      } catch (s3Error) {
                          console.error(`S3 Share Gallery (GUID Regen) Delete Fail: ${img.s3Key}`, s3Error);
                      }
                  }
              }
          }

          const newGuid = uuidv4();
          
          // Now, atomically update the document
          const updatedWedding = await WeddingData.findOneAndUpdate(
              { customId: customId },
              { 
                  $set: { 
                      shareGalleryGuid: newGuid,
                      shareGalleryImages: [] // Also clear the images array
                  } 
              },
              { new: true } // Return the updated document
          );

          if (!updatedWedding) {
              return createResponse(404, { message: 'Wedding data not found during update.' }, requestOrigin);
          }
          
          return createResponse(200, { newGuid: updatedWedding.shareGalleryGuid }, requestOrigin);
      }

      // DELETE /api/weddings/:customId/share-gallery/images/:imageId (For Setup Page)
      const deleteShareGalleryImageMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_.-]+)\/share-gallery\/images\/([a-zA-Z0-9_.-]+)$/);
      if (httpMethod === "DELETE" && deleteShareGalleryImageMatch) {
          const customId = deleteShareGalleryImageMatch[1];
          const imageId = deleteShareGalleryImageMatch[2];
          const wedding = await WeddingData.findOne({ customId });
          if (!wedding) return createResponse(404, { message: 'Wedding data not found.' }, requestOrigin);

          const imageToDelete = wedding.shareGalleryImages.id(imageId);
          if (!imageToDelete) return createResponse(404, { message: 'Share gallery image not found by ID.' }, requestOrigin);
          
          if (imageToDelete.s3Key) {
              try {
                  await s3Client.send(new DeleteObjectCommand({ Bucket: AWS_S3_BUCKET_NAME, Key: imageToDelete.s3Key }));
                  console.log(`S3 Share Gallery Delete: ${imageToDelete.s3Key}`);
              } catch (s3Error) { console.error(`S3 Share Gallery Delete Fail: ${imageToDelete.s3Key}`, s3Error); }
          }
          wedding.shareGalleryImages.pull({ _id: imageId });
          await wedding.save();
          return createResponse(200, { message: 'Share gallery image deleted.', images: wedding.shareGalleryImages }, requestOrigin);
      }

      // --- Public Share Gallery Endpoints ---
      
      // GET /api/weddings/:customId/share-gallery/:guid (For Guest Page to fetch images)
      const getPublicShareGalleryMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/share-gallery\/([a-zA-Z0-9-]+)$/);
      if (httpMethod === "GET" && getPublicShareGalleryMatch) {
        const customId = getPublicShareGalleryMatch[1];
        const guid = getPublicShareGalleryMatch[2];
        
        // First, find the wedding by customId to see if the link is just stale
        const wedding = await WeddingData.findOne({ customId: customId });
        if (!wedding) return createResponse(404, { message: 'Gallery not found. The wedding ID may be incorrect.' }, requestOrigin);

        // Now check if the GUID matches. If not, the link is stale.
        if (wedding.shareGalleryGuid !== guid) {
          return createResponse(409, { 
            message: 'Conflict: This share link is outdated.', 
            correctGuid: wedding.shareGalleryGuid 
          }, requestOrigin);
        }

        // If we're here, the GUID is valid. Proceed as before.
        return createResponse(200, {
          eventName: wedding.eventName,
          images: wedding.shareGalleryImages || [],
          weddingId: wedding.customId // Keep sending this for the uploader utility
        }, requestOrigin);
      }
      
      // POST /api/share-gallery/:guid/images (For Guest Page to save image ref)
      const postPublicShareGalleryImageMatch = routePath.match(/^\/api\/share-gallery\/([a-zA-Z0-9-]+)\/images$/);
      if (httpMethod === "POST" && postPublicShareGalleryImageMatch) {
        const guid = postPublicShareGalleryImageMatch[1];
        const { imageUrl, s3Key, uploadedBy } = body;
        if (!imageUrl || !s3Key || !uploadedBy) {
          return createResponse(400, { message: 'imageUrl, s3Key, and uploadedBy are required.' }, requestOrigin);
        }

        const wedding = await WeddingData.findOne({ shareGalleryGuid: guid });
        if (!wedding) return createResponse(404, { message: 'Gallery not found.' }, requestOrigin);
        
        if (!wedding.shareGalleryImages) {
            wedding.shareGalleryImages = [];
        }

        wedding.shareGalleryImages.push({
          fileName: imageUrl,
          s3Key,
          uploadedBy: uploadedBy || 'Anonymous',
          uploadedAt: new Date()
        });

        await wedding.save();
        const newImage = wedding.shareGalleryImages[wedding.shareGalleryImages.length - 1];
        return createResponse(201, { message: 'Image uploaded successfully.', image: newImage }, requestOrigin);
      }

      // POST /api/weddings/:customId/verify-setup-password
      const verifyPasswordMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/verify-setup-password$/);
      if (httpMethod === "POST" && verifyPasswordMatch) {
          const customId = verifyPasswordMatch[1];
          const { password } = body;
          if (!password) return createResponse(400, { message: 'Password is required for verification.' }, requestOrigin);
          
          const wedding = await WeddingData.findOne({ customId }).select('+setupPassword'); // Ensure password is selected
          if (!wedding) return createResponse(404, { message: 'Wedding data not found for password verification.' }, requestOrigin);
          if (!wedding.setupPassword) return createResponse(401, { message: 'Setup password not configured for this wedding.' }, requestOrigin);

          const isMatch = await bcrypt.compare(password, wedding.setupPassword);
          if (isMatch) return createResponse(200, { success: true, message: 'Password verified.' }, requestOrigin);
          
          return createResponse(401, { success: false, message: 'Invalid password.' }, requestOrigin);
      }

      // PUT /api/weddings/:customId/change-password
      const changePasswordMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/change-password$/);
      if (httpMethod === "PUT" && changePasswordMatch) {
          const customId = changePasswordMatch[1];
          const { currentPassword, newPassword, confirmNewPassword } = body;

          if (!currentPassword || !newPassword || !confirmNewPassword) {
              return createResponse(400, { message: 'Current password, new password, and confirmation are required.' }, requestOrigin);
          }
          if (newPassword !== confirmNewPassword) {
              return createResponse(400, { message: 'New password and confirmation do not match.' }, requestOrigin);
          }
          if (newPassword.length < 1) { // Basic validation, can be made more robust
              return createResponse(400, { message: 'New password is too short.' }, requestOrigin);
          }

          const wedding = await WeddingData.findOne({ customId }).select('+setupPassword');
          if (!wedding) {
              return createResponse(404, { message: 'Wedding data not found.' }, requestOrigin);
          }
          if (!wedding.setupPassword) {
              return createResponse(401, { message: 'Setup password not configured. Cannot change.' }, requestOrigin);
          }

          const isMatch = await bcrypt.compare(currentPassword, wedding.setupPassword);
          if (!isMatch) {
              return createResponse(401, { message: 'Incorrect current password.' }, requestOrigin);
          }

          const salt = await bcrypt.genSalt(10);
          wedding.setupPassword = await bcrypt.hash(newPassword, salt);
          await wedding.save();

          return createResponse(200, { success: true, message: 'Password changed successfully.' }, requestOrigin);
      }

      // PUT /api/weddings/:customId/rsvp-settings
      const rsvpSettingsMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/rsvp-settings$/);
      if (httpMethod === 'PUT' && rsvpSettingsMatch) {
          const customId = rsvpSettingsMatch[1];
          const { isPlated, allowKids, platedOptions } = body;

          console.log(`[PUT /rsvp-settings] Updating RSVP settings for ${customId}`, { isPlated, allowKids, platedOptions: platedOptions?.length });

          if (typeof isPlated !== 'boolean') {
              return createResponse(400, { message: 'isPlated must be a boolean.' }, requestOrigin);
          }
          if (allowKids !== undefined && typeof allowKids !== 'boolean') {
              return createResponse(400, { message: 'allowKids must be a boolean.' }, requestOrigin);
          }
          if (!Array.isArray(platedOptions)) {
            return createResponse(400, { message: 'platedOptions must be an array.' }, requestOrigin);
          }

          const updateFields = { isPlated, platedOptions };
          if (allowKids !== undefined) {
              updateFields.allowKids = allowKids;
          }

          const updatedWedding = await WeddingData.findOneAndUpdate(
              { customId: customId },
              { $set: updateFields },
              { new: true, runValidators: true }
          );

          if (!updatedWedding) {
              return createResponse(404, { message: 'Wedding not found.' }, requestOrigin);
          }

          return createResponse(200, { message: 'RSVP settings updated successfully.', wedding: updatedWedding }, requestOrigin);
      }

      // GET /api/weddings/:customId/navbar-settings
      const getNavbarSettingsMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/navbar-settings$/);
      if (httpMethod === 'GET' && getNavbarSettingsMatch) {
          const customId = getNavbarSettingsMatch[1];
          
          console.log(`[GET /navbar-settings] Fetching navbar settings for ${customId}`);
          
          const wedding = await WeddingData.findOne({ customId });
          if (!wedding) {
              return createResponse(404, { message: 'Wedding not found.' }, requestOrigin);
          }

          // Return navbar settings or default structure if not set
          const navbarSettings = wedding.navbarSettings || {
              items: [],
              isEnabled: true
          };

          return createResponse(200, { success: true, data: navbarSettings }, requestOrigin);
      }

      // POST /api/weddings/:customId/navbar-settings
      const postNavbarSettingsMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/navbar-settings$/);
      if (httpMethod === 'POST' && postNavbarSettingsMatch) {
          const customId = postNavbarSettingsMatch[1];
          const navbarSettings = body;

          console.log(`[POST /navbar-settings] Updating navbar settings for ${customId}`, navbarSettings);

          // Basic validation
          if (!navbarSettings || typeof navbarSettings !== 'object') {
              return createResponse(400, { message: 'Invalid navbar settings data.' }, requestOrigin);
          }

          if (!Array.isArray(navbarSettings.items)) {
              return createResponse(400, { message: 'Navbar items must be an array.' }, requestOrigin);
          }

          if (typeof navbarSettings.isEnabled !== 'boolean') {
              return createResponse(400, { message: 'isEnabled must be a boolean.' }, requestOrigin);
          }

          const updatedWedding = await WeddingData.findOneAndUpdate(
              { customId: customId },
              { $set: { navbarSettings: navbarSettings } },
              { new: true, runValidators: true }
          );

          if (!updatedWedding) {
              return createResponse(404, { message: 'Wedding not found.' }, requestOrigin);
          }

          return createResponse(200, { success: true, message: 'Navbar settings updated successfully.', data: updatedWedding.navbarSettings }, requestOrigin);
      }

      // Fallback for unhandled API routes
      console.log(`[HANDLER] API Route not found for ${httpMethod} ${routePath}`);
      return createResponse(404, { message: `The requested API resource for ${httpMethod} ${routePath} was not found.` }, requestOrigin);

    } catch (error) {
      console.error(`[HANDLER] Error processing API ${httpMethod} ${routePath}:`, error);
      return createResponse(500, { message: 'Internal Server Error', errorName: error.name, errorMessage: error.message }, requestOrigin);
    }
  } else if (httpMethod === "GET") { // --- Handle Non-API GET requests (Serve index.html) ---
    try {
      // Ensure database connection
      await connectToDatabase(); // Needed to fetch wedding data for meta tags

      const weddingIdMatch = routePath.match(/^\/([a-zA-Z0-9_-]+)$/); // Matches /weddingId
      const isRootPath = routePath === '/' || routePath === '';
      let weddingIdForMeta = null;
      let weddingDataForMeta = null;
      const siteUrl = process.env.SITE_URL || 'https://weddingwriteback.com'; // Define your site URL

      if (weddingIdMatch) {
        weddingIdForMeta = weddingIdMatch[1];
        console.log(`[HTML_SERVE] Extracted weddingIdForMeta: ${weddingIdForMeta}`); // Log extracted ID
      } else if (isRootPath) {
        console.log('[HTML_SERVE] Path is root, no specific weddingIdForMeta extracted for meta tags initially.');
        // weddingIdForMeta = "erickson2025"; // Example default if you want one for root
      }

      if (weddingIdForMeta) {
        console.log(`[HTML_SERVE] Attempting to fetch wedding data for meta tags: ${weddingIdForMeta}`);
        weddingDataForMeta = await WeddingData.findOne({ customId: weddingIdForMeta });
        console.log('[HTML_SERVE] weddingDataForMeta value after findOne:', JSON.stringify(weddingDataForMeta));
      } else {
        console.log('[HTML_SERVE] No weddingIdForMeta to use for fetching data.');
      }

      // Determine path to index.html. In Lambda, relative paths can be tricky.
      // Assuming 'public/index.html' is packaged relative to this server.js file.
      // Adjust if your build/deployment structure is different.
      const indexPath = path.resolve(__dirname, '..', 'public', 'index.html'); // Assumes server.js is in backend/, public/ is sibling to backend/
      console.log(`[HTML_SERVE] Attempting to read index.html from: ${indexPath}`);
      
      let htmlContent = fs.readFileSync(indexPath, 'utf8');

      let ogTitle = 'Wedding WriteBack';
      let ogDescription = 'Create and share your beautiful wedding website.';
      let pageTitle = 'Wedding WriteBack';
      let metaDescription = 'Create and share your beautiful wedding website. RSVP and write a message to the bride and groom!';
      let ogUrl = siteUrl;

      if (weddingDataForMeta) {
        console.log('[HTML_SERVE] weddingDataForMeta IS TRUTHY. Preparing dynamic tags.'); // New log
        const eventName = weddingDataForMeta.eventName || weddingDataForMeta.customId;
        pageTitle = `${eventName} - Wedding WriteBack`;
        ogTitle = eventName; // For the format "Erickson 2025"
        ogDescription = `View details and RSVP for the wedding of ${weddingDataForMeta.brideName || 'the couple'} and ${weddingDataForMeta.groomName || ''}.`;
        metaDescription = ogDescription;
        ogUrl = `${siteUrl}/${weddingDataForMeta.customId}`;
      } else if (weddingIdForMeta) { // Wedding ID in URL but no data found
        console.log("[HTML_SERVE] weddingDataForMeta IS FALSY, but weddingIdForMeta was present. Using 'Not Found' tags."); // New log
        pageTitle = `Wedding ${weddingIdForMeta} - Not Found`;
        ogTitle = `Wedding ${weddingIdForMeta}`;
        ogDescription = `Details for wedding ${weddingIdForMeta} could not be found.`;
        metaDescription = ogDescription;
        ogUrl = `${siteUrl}/${weddingIdForMeta}`;
      } else {
        console.log('[HTML_SERVE] No weddingIdForMeta and weddingDataForMeta is falsy. Using default site tags.'); // New log
      }

      htmlContent = htmlContent.replace(/__PAGE_TITLE__/g, pageTitle)
                               .replace(/__OG_TITLE__/g, ogTitle)
                               .replace(/__OG_DESCRIPTION__/g, ogDescription)
                               .replace(/__META_DESCRIPTION__/g, metaDescription)
                               .replace(/__OG_URL__/g, ogUrl);
      
      console.log(`[HTML_SERVE] Serving HTML for ${routePath} with title: ${ogTitle}`);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: htmlContent,
      };

    } catch (error) {
      console.error('[HTML_SERVE] Error serving dynamic index.html:', error);
      // Fallback: Serve a generic error or a very basic index.html
      // Or, if the error is that index.html itself is not found, this is a critical deployment issue.
      // For now, return a simple 500 error for HTML serving issues.
      // Note: HTML responses don't typically need complex CORS like API, but createResponse handles it.
      // If serving HTML, a simple wildcard might be fine, or no CORS headers if same-origin.
      // However, using createResponse ensures consistency if any script within HTML makes cross-origin requests that rely on these.
      return createResponse(500, { message: "Error serving page content." }, requestOrigin);
    }
  } else { // --- Fallback for other methods or unhandled non-API GETs ---
    console.log(`[HANDLER] Route not found or method not allowed for ${httpMethod} ${routePath}`);
    return createResponse(404, { message: `The requested resource for ${httpMethod} ${routePath} was not found or method not allowed.` }, requestOrigin);
  }
};
