/**
 * config/db.js
 * ---------------------------------------------------------------
 * Single place where the application connects to MongoDB.
 *
 * The connection string is NEVER hard-coded: it is read from the
 * environment variable MONGODB_URI (see .env / .env.example).
 *
 * Because the app can also run on Vercel (serverless), every request
 * may start a brand new function instance. To avoid opening a new
 * database connection on every single request we cache the connection
 * on the global object and reuse it.
 * ---------------------------------------------------------------
 */

const mongoose = require('mongoose');

// Cache holder (survives between warm serverless invocations)
let cached = global.__mongooseCache;
if (!cached) {
  cached = global.__mongooseCache = { conn: null, promise: null };
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_URI is not defined. Create a .env file (copy .env.example) and set MONGODB_URI.'
    );
  }

  // Already connected -> reuse
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true);

    cached.promise = mongoose
      .connect(uri, {
        // Fail fast instead of hanging forever if the DB is unreachable
        serverSelectionTimeoutMS: 10000,
      })
      .then((m) => {
        console.log(`[db] MongoDB connected: ${m.connection.host}`);
        return m;
      })
      .catch((err) => {
        // Reset so a later request can retry
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
