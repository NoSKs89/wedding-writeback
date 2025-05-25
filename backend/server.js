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
          return createResponse(200, wedding, requestOrigin);
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

      // POST /api/weddings/:customId/layout-settings
      const postLayoutSettingsMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/layout-settings$/);
      if (httpMethod === "POST" && postLayoutSettingsMatch) {
          const customId = postLayoutSettingsMatch[1];
          const newLayoutSettings = body;
          const view = event.queryStringParameters?.view || 'desktop'; // Default to 'desktop'
          const fieldToUpdate = view === 'mobile' ? 'layoutSettingsMobile' : 'layoutSettings';

          console.log(`[POST /layout-settings] customId: ${customId}, view: ${view}, updating: ${fieldToUpdate}`);

          if (typeof newLayoutSettings !== 'object' || newLayoutSettings === null) {
              return createResponse(400, { message: 'Invalid layout settings. Expected an object.' }, requestOrigin);
          }
          
          const updateQuery = { $set: { [fieldToUpdate]: newLayoutSettings } };
          const wedding = await WeddingData.findOneAndUpdate(
              { customId }, 
              updateQuery,
              { new: true, runValidators: true, select: `${fieldToUpdate} customId` }
          );
          if (!wedding) return createResponse(404, { message: 'Wedding data not found for layout update.' }, requestOrigin);
          
          return createResponse(200, { message: `Layout settings for ${view} view saved.`, [fieldToUpdate]: wedding[fieldToUpdate] }, requestOrigin);
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
      
      // POST /api/rsvp/:customId
      const rsvpMatch = routePath.match(/^\/api\/rsvp\/([a-zA-Z0-9_-]+)$/);
      if (httpMethod === "POST" && rsvpMatch) {
          const customId = rsvpMatch[1];
          const rsvpPayload = body;
          const weddingDetails = await WeddingData.findOne({ customId });
          if (!weddingDetails) return createResponse(404, { message: `Wedding ID '${customId}' not found for RSVP.` }, requestOrigin);

          const newRsvp = new Rsvp({ ...rsvpPayload, weddingId: customId });
          const savedRsvp = await newRsvp.save();
          
          if (RSVP_TO_EMAIL && RSVP_FROM_EMAIL) {
              let mealInfo = 'N/A';
              if (rsvpPayload.attending && rsvpPayload.mealChoices) {
                if (typeof rsvpPayload.mealChoices === 'string') mealInfo = rsvpPayload.mealChoices;
                else if (typeof rsvpPayload.mealChoices === 'object') {
                  mealInfo = Object.entries(rsvpPayload.mealChoices).map(([m, q]) => `${m}: ${q}`).join(', ');
                }
              }
              const emailSubject = `New RSVP: ${rsvpPayload.firstName} ${rsvpPayload.lastName} for ${weddingDetails.eventName || customId}`;
              const emailBody = `<h1>RSVP Received</h1><p>Name: ${rsvpPayload.firstName} ${rsvpPayload.lastName}</p><p>Attending: ${rsvpPayload.attending ? 'Yes' : 'No'}</p>${rsvpPayload.attending ? `<p>Guests: ${rsvpPayload.guestCount}</p>` : ''}
              ${rsvpPayload.attending && weddingDetails.isPlated ? `<p>Meal Choices: ${mealInfo}</p>` : ''}<p>Message: ${rsvpPayload.message || 'N/A'}</p><p>ID: ${savedRsvp._id}</p>`;
              try {
                  await sesClient.send(new SendEmailCommand({
                      Destination: { ToAddresses: [RSVP_TO_EMAIL] },
                      Message: { Body: { Html: { Charset: "UTF-8", Data: emailBody }, Text: { Charset: "UTF-8", Data: emailBody.replace(/<[^>]+>/g, '') } }, Subject: { Charset: "UTF-8", Data: emailSubject } },
                      Source: RSVP_FROM_EMAIL,
                  }));
                  console.log('RSVP email sent.');
              } catch (emailError) { console.error('RSVP email send failed:', emailError); }
          }
          return createResponse(201, savedRsvp, requestOrigin);
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

// Note: Removed Item model routes as they were not in the more complex parts of the original server.js
// If needed, they can be added back following the pattern above.
// Example:
// if (httpMethod === "GET" && path === "/api/items") {
//   const items = await Item.find();
//   return createResponse(200, items, requestOrigin);
// }
// if (httpMethod === "POST" && path === "/api/items") {
//   const newItem = new Item({ name: body.name });
//   const item = await newItem.save();
//   return createResponse(201, item, requestOrigin);
// } 