/**
 * server.js
 * ---------------------------------------------------------------
 * Entry point for running the application LOCALLY.
 *
 * It only:
 *   1. loads the environment variables,
 *   2. connects to MongoDB,
 *   3. starts the Express server created in app.js
 *
 * All configuration lives in app.js and all logic in the controllers,
 * so nothing "business related" is inside this file.
 * ---------------------------------------------------------------
 */

require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    // Connect to MongoDB before accepting requests
    await connectDB();

    app.listen(PORT, () => {
      console.log('--------------------------------------------------');
      console.log(`  User Authentication App running`);
      console.log(`  http://localhost:${PORT}`);
      console.log('--------------------------------------------------');
    });
  } catch (err) {
    console.error('Failed to start the server:', err.message);
    console.error('Check that MONGODB_URI in your .env file is correct.');
    process.exit(1);
  }
})();
