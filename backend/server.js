console.log("--- NATIVE LAMBDA HANDLER - Initializing ---");

const mongoose = require('mongoose');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { v4: uuidv4 } = require('uuid');

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
const createResponse = (statusCode, body, additionalHeaders = {}) => {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*", // Adjust for your domain in production
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
      ...additionalHeaders,
    },
    body: JSON.stringify(body),
  };
};

// --- Main Lambda Handler ---
exports.handler = async (event, context) => {
  // context.callbackWaitsForEmptyEventLoop = true; // Default is true, usually fine. If false, connections might close prematurely.

  console.log('[HANDLER] Event Received:', JSON.stringify(event, null, 2)); // Log the event for debugging

  // Ensure database connection
  try {
    await connectToDatabase();
  } catch (dbError) {
    console.error('[HANDLER] Critical: Failed to connect to database for request.', dbError);
    return createResponse(500, { message: "Internal Server Error - Database connection failed" });
  }

  const httpMethod = event.requestContext.http.method;
  
  // NEW WAY to get path for routing, removing the stage if present
  let routePath = event.requestContext.http.path;
  const stage = event.requestContext.stage;
  if (routePath.startsWith(`/${stage}`)) {
    routePath = routePath.substring(stage.length + 1); // Remove /stage, e.g. /dev/api/hello -> /api/hello
  }
  // Ensure routePath starts with a / if it became empty or was just the stage name
  if (!routePath.startsWith('/')) {
    routePath = '/' + routePath;
  }

  console.log(`[HANDLER] Determined routePath for matching: ${routePath}`);
  console.log(`[HANDLER] HTTP Method for matching: ${httpMethod}`);

  // --- Handle CORS Preflight OPTIONS requests globally ---
  if (httpMethod === 'OPTIONS') {
    console.log(`[HANDLER] Responding to OPTIONS preflight for ${routePath}`)
    return createResponse(200, {}); // Return 200 OK with CORS headers from createResponse
  }
  // --- End CORS Preflight --- 

  const pathParametersFromEvent = event.pathParameters || {};
  let body = {};

  if (event.body && typeof event.body === 'string') {
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      console.error('[HANDLER] Error parsing JSON body:', parseError);
      return createResponse(400, { message: "Invalid JSON format in request body." });
    }
  } else if (event.body) {
    body = event.body;
  }

  try {
    // Simple GET /api/hello
    if (httpMethod === "GET" && routePath === "/api/hello") {
      return createResponse(200, { message: 'Hello from the native Lambda backend!' });
    }

    // GET /api/items
    if (httpMethod === "GET" && routePath === "/api/items") {
        const items = await Item.find();
        return createResponse(200, items);
    }

    // POST /api/items
    if (httpMethod === "POST" && routePath === "/api/items") {
        const newItem = new Item({ name: body.name });
        const item = await newItem.save();
        return createResponse(201, item);
    }

    // GET /api/weddings/:customId
    const getWeddingByIdMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)$/);
    if (httpMethod === "GET" && getWeddingByIdMatch) {
        const customId = getWeddingByIdMatch[1];
        console.log(`[ROUTE /api/weddings/:customId] Request for ${customId}. Mongoose readyState: ${mongoose.connection.readyState}`);
        const wedding = await WeddingData.findOne({ customId });
        if (!wedding) {
            return createResponse(404, { message: 'Wedding data not found' });
        }
        return createResponse(200, wedding);
    }    

    // POST /api/weddings
    if (httpMethod === "POST" && routePath === "/api/weddings") {
        const weddingPayload = body;
        if (!weddingPayload.customId) {
            return createResponse(400, { message: 'customId is required' });
        }
        const wedding = await WeddingData.findOneAndUpdate(
            { customId: weddingPayload.customId }, weddingPayload,
            { new: true, upsert: true, runValidators: true }
        );
        return createResponse(wedding ? 201 : 400, wedding || { message: "Failed to create/update wedding" });
    }

    // GET /api/weddings/:customId/layout-settings
    const getLayoutSettingsMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/layout-settings$/);
    if (httpMethod === "GET" && getLayoutSettingsMatch) {
        const customId = getLayoutSettingsMatch[1];
        const view = event.queryStringParameters?.view || 'desktop'; // Default to 'desktop'
        const fieldToSelect = view === 'mobile' ? 'layoutSettingsMobile' : 'layoutSettings';
        
        console.log(`[GET /layout-settings] customId: ${customId}, view: ${view}, selecting: ${fieldToSelect}`);

        const wedding = await WeddingData.findOne({ customId }).select(`${fieldToSelect} customId`);
        if (!wedding) return createResponse(404, { message: 'Wedding data not found' });
        
        return createResponse(200, wedding[fieldToSelect] || {});
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
            return createResponse(400, { message: 'Invalid layout settings. Expected an object.' });
        }
        
        const updateQuery = { $set: { [fieldToUpdate]: newLayoutSettings } };
        const wedding = await WeddingData.findOneAndUpdate(
            { customId }, 
            updateQuery,
            { new: true, runValidators: true, select: `${fieldToUpdate} customId` }
        );
        if (!wedding) return createResponse(404, { message: 'Wedding data not found for layout update.' });
        
        return createResponse(200, { message: `Layout settings for ${view} view saved.`, [fieldToUpdate]: wedding[fieldToUpdate] });
    }
    
    // POST /api/s3/presigned-url
    const presignedUrlMatch = routePath.match(/^\/api\/s3\/presigned-url$/);
    if (httpMethod === "POST" && presignedUrlMatch) {
        const { fileName, fileType, weddingId, imageType } = body;
        if (!fileName || !fileType || !weddingId || !imageType) {
            return createResponse(400, { message: 'fileName, fileType, weddingId, and imageType are required.' });
        }
        let s3KeyPrefix = '';
        switch (imageType) {
            case 'introCouple': case 'introBackground': s3KeyPrefix = `${weddingId}/main/`; break;
            case 'scrapbook': s3KeyPrefix = `${weddingId}/scrapbook/`; break;
            default: return createResponse(400, { message: 'Invalid imageType.' });
        }
        const uniqueFileName = `${s3KeyPrefix}${uuidv4()}-${fileName.replace(/\s+/g, '_')}`;
        const command = new PutObjectCommand({ Bucket: AWS_S3_BUCKET_NAME, Key: uniqueFileName, ContentType: fileType });
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        const publicUrl = `https://${AWS_S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${uniqueFileName}`;
        return createResponse(200, { presignedUrl, publicUrl, key: uniqueFileName });
    }

    // POST /api/weddings/:customId/images
    const postImageMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/images$/);
    if (httpMethod === "POST" && postImageMatch) {
        const customId = postImageMatch[1];
        const { imageUrl, caption, s3Key, imageType } = body;
        if (!imageUrl || !imageType) return createResponse(400, { message: 'imageUrl and imageType are required.' });
        if (imageType === 'scrapbook' && !s3Key) return createResponse(400, { message: 's3Key required for scrapbook images.' });

        const wedding = await WeddingData.findOne({ customId });
        if (!wedding) return createResponse(404, { message: 'Wedding data not found for image update.' });

        if (imageType === 'introCouple') wedding.introCouple = imageUrl;
        else if (imageType === 'introBackground') wedding.introBackground = imageUrl;
        else if (imageType === 'scrapbook') {
            wedding.scrapbookImages.push({ fileName: imageUrl, s3Key, caption: caption || '', uploadedAt: new Date() });
        } else return createResponse(400, { message: 'Invalid imageType for image post.' });
        
        await wedding.save();
        return createResponse(200, { message: `Image for ${imageType} saved.`, weddingData: wedding });
    }

    // DELETE /api/weddings/:customId/images/:imageId
    const deleteImageMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/images\/([a-zA-Z0-9_.-]+)$/);
    if (httpMethod === "DELETE" && deleteImageMatch) {
        const customId = deleteImageMatch[1];
        const imageId = deleteImageMatch[2];
        const wedding = await WeddingData.findOne({ customId });
        if (!wedding) return createResponse(404, { message: 'Wedding data not found for image delete.' });
        
        const imageToDelete = wedding.scrapbookImages.id(imageId);
        if (!imageToDelete) return createResponse(404, { message: 'Scrapbook image not found by ID.' });
        
        if (imageToDelete.s3Key) {
            try {
                await s3Client.send(new DeleteObjectCommand({ Bucket: AWS_S3_BUCKET_NAME, Key: imageToDelete.s3Key }));
                console.log(`S3 Delete: ${imageToDelete.s3Key}`);
            } catch (s3Error) { console.error(`S3 Delete Fail: ${imageToDelete.s3Key}`, s3Error); }
        }
        wedding.scrapbookImages.pull({ _id: imageId });
        await wedding.save();
        return createResponse(200, { message: 'Scrapbook image deleted.', weddingData: wedding });
    }

    // DELETE /api/weddings/:customId/scrapbook-images
    const clearScrapbookMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/scrapbook-images$/);
    if (httpMethod === "DELETE" && clearScrapbookMatch) {
        const customId = clearScrapbookMatch[1];
        const wedding = await WeddingData.findOne({ customId });
        if (!wedding) return createResponse(404, { message: 'Wedding data not found for scrapbook clear.' });
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
        return createResponse(200, { message: 'All scrapbook images cleared.', weddingData: wedding });
    }
    
    // POST /api/rsvp/:customId
    const rsvpMatch = routePath.match(/^\/api\/rsvp\/([a-zA-Z0-9_-]+)$/);
    if (httpMethod === "POST" && rsvpMatch) {
        const customId = rsvpMatch[1];
        const rsvpPayload = body;
        const weddingDetails = await WeddingData.findOne({ customId });
        if (!weddingDetails) return createResponse(404, { message: `Wedding ID '${customId}' not found for RSVP.` });

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
        return createResponse(201, savedRsvp);
    }

    // POST /api/weddings/:customId/verify-setup-password
    const verifyPasswordMatch = routePath.match(/^\/api\/weddings\/([a-zA-Z0-9_-]+)\/verify-setup-password$/);
    if (httpMethod === "POST" && verifyPasswordMatch) {
        const customId = verifyPasswordMatch[1];
        const { password } = body;
        if (!password) return createResponse(400, { message: 'Password is required for verification.' });
        const wedding = await WeddingData.findOne({ customId }).select('setupPassword');
        if (!wedding) return createResponse(404, { message: 'Wedding data not found for password verification.' });
        if (!wedding.setupPassword) return createResponse(401, { message: 'Setup password not configured for this wedding.' });
        if (password === wedding.setupPassword) return createResponse(200, { success: true, message: 'Password verified.' });
        return createResponse(401, { success: false, message: 'Invalid password.' });
    }

    // Fallback for unhandled routes
    console.log(`[HANDLER] Route not found for ${httpMethod} ${routePath}`);
    return createResponse(404, { message: `The requested resource for ${httpMethod} ${routePath} was not found.` });

  } catch (error) {
    console.error(`[HANDLER] Error processing ${httpMethod} ${routePath}:`, error);
    return createResponse(500, { message: 'Internal Server Error', errorName: error.name, errorMessage: error.message });
  }
};

// Note: Removed Item model routes as they were not in the more complex parts of the original server.js
// If needed, they can be added back following the pattern above.
// Example:
// if (httpMethod === "GET" && path === "/api/items") {
//   const items = await Item.find();
//   return createResponse(200, items);
// }
// if (httpMethod === "POST" && path === "/api/items") {
//   const newItem = new Item({ name: body.name });
//   const item = await newItem.save();
//   return createResponse(201, item);
// } 