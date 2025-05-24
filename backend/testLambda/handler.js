console.log('[TEST_LAMBDA_LOAD] Loading function...'); // To see if the file itself loads

const mongoose = require('mongoose');

// Enable Mongoose debug mode with a custom logger
mongoose.set('debug', function (collectionName, methodName, ...methodArgs) {
  const safeArgs = methodArgs.map(arg => {
    // Attempt to stringify, but catch errors for complex/circular objects
    try {
      return JSON.stringify(arg);
    } catch (e) {
      return '[Unstringifiable Argument]';
    }
  });
  const msg = `Mongoose (Test Lambda): ${collectionName}.${methodName}(${safeArgs.join(', ')})`;
  console.log(msg);
});
console.log('[TEST_LAMBDA_INIT] Mongoose debug mode has been set WITH CUSTOM LOGGER.');

const MONGO_URI = process.env.MONGO_URI;

exports.handler = async (event, context) => {
  // context.callbackWaitsForEmptyEventLoop = true; // Ensure Lambda waits for async operations like DB connect

  console.log('[TEST_LAMBDA_HANDLER] Handler invoked.');
  console.log(`[TEST_LAMBDA_HANDLER] MONGO_URI: ${MONGO_URI ? MONGO_URI.substring(0, MONGO_URI.indexOf('@') > 0 ? MONGO_URI.indexOf('@') : 30) + "..." : "MONGO_URI NOT SET"}`);

  if (!MONGO_URI) {
    console.error('[TEST_LAMBDA_HANDLER] MONGO_URI environment variable not set!');
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'MONGO_URI not set' }),
    };
  }

  try {
    console.log('[TEST_LAMBDA_HANDLER] Attempting mongoose.connect()...');
    // For Mongoose v6+ you generally don't need many options for basic connections.
    // For older versions, you might need: { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 5000 }
    await mongoose.connect(MONGO_URI); 
    console.log('[TEST_LAMBDA_HANDLER] MongoDB connected successfully via Mongoose!');
    
    // Optional: A simple operation to confirm connection
    // Replace 'TestItem' and schema with something relevant if you want to test an actual query.
    // const TestItemSchema = new mongoose.Schema({ name: String });
    // let TestItem;
    // try {
    //   TestItem = mongoose.model('TestItem');
    // } catch (error) {
    //   TestItem = mongoose.model('TestItem', TestItemSchema);
    // }
    // const count = await TestItem.countDocuments();
    // console.log(`[TEST_LAMBDA_HANDLER] Found ${count} items in TestItem collection.`);

    // In a real app, you'd typically keep the connection open for the lifetime of the container.
    // For this specific test, to be clean, we can disconnect.
    // await mongoose.disconnect();
    // console.log('[TEST_LAMBDA_HANDLER] MongoDB disconnected.');

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'MongoDB connection successful (Test Lambda)' }),
    };
  } catch (error) {
    console.error('[TEST_LAMBDA_HANDLER] MongoDB connection error:', error);
    console.error('[TEST_LAMBDA_HANDLER] Error Name:', error.name);
    console.error('[TEST_LAMBDA_HANDLER] Error Message:', error.message);
    if (error.reason) { // Mongoose often includes a 'reason' object for connection errors
        console.error('[TEST_LAMBDA_HANDLER] Error Reason:', JSON.stringify(error.reason, Object.getOwnPropertyNames(error.reason)));
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'MongoDB connection failed (Test Lambda)', 
        errorName: error.name,
        errorMessage: error.message,
        errorReason: error.reason ? JSON.stringify(error.reason, Object.getOwnPropertyNames(error.reason)) : "No reason provided"
      }),
    };
  }
};