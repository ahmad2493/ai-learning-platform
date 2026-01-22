/**
 * AWS S3 Configuration - File Storage Service
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Configures AWS S3 client for file uploads
 * - Handles profile picture and document storage
 * - Manages secure file access and retrieval
 * - Provides S3 instance for file operations
 */

const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

module.exports = new AWS.S3();
