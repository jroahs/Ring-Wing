const mongoose = require('mongoose');
require('dotenv').config();

// Connection options for better stability
const mongooseOptions = {
  // Connection pooling
  maxPoolSize: 50,
  minPoolSize: 10,
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  connectTimeoutMS: 30000, // Give up initial connection after 30 seconds
  serverSelectionTimeoutMS: 5000, // Keep trying to connect for 5 seconds
  heartbeatFrequencyMS: 10000, // Check connection health every 10 seconds
  retryWrites: true,
  retryReads: true
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, mongooseOptions);
    console.log('MongoDB connected successfully');
    
    // Set up connection event handlers
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
      // Don't exit the process, just log the error
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected, attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });
    
  } catch (err) {
    console.error('MongoDB initial connection error:', err.message);
    // Don't exit the process immediately, allow for retries
    setTimeout(() => {
      console.log('Retrying MongoDB connection...');
      connectDB();
    }, 5000);
  }
};

module.exports = connectDB;