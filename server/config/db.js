const mongoose = require('mongoose');

/**
 * Connects to MongoDB. Fails fast with a helpful message or falls back to local MongoDB.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/duohabit';
  const localFallbackUri = 'mongodb://127.0.0.1:27017/duohabit';

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    console.warn(`Primary MongoDB connection failed (${err.message}).`);
    if (uri !== localFallbackUri) {
      console.log('Attempting connection to local MongoDB fallback at 127.0.0.1:27017...');
      try {
        const conn = await mongoose.connect(localFallbackUri, { serverSelectionTimeoutMS: 3000 });
        console.log(`Connected to local MongoDB fallback: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      } catch (localErr) {
        console.error(`Local MongoDB fallback connection also failed: ${localErr.message}`);
      }
    }
    console.error(
      'MongoDB connection error:\n' +
      'Please check that your MongoDB Atlas IP whitelist includes your current IP, ' +
      'or ensure local MongoDB is running.'
    );
    process.exit(1);
  }
}

module.exports = connectDB;