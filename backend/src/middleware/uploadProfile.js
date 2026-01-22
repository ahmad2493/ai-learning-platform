/**
 * Profile Upload Middleware - File Upload Configuration
 * Author: Muhammad Abubakar (BCSF22M006)
 * 
 * Functionality:
 * - Configures Multer for profile picture uploads
 * - Integrates with AWS S3 for file storage
 * - Validates file size (5MB limit)
 * - Generates unique file names with timestamps
 * - Handles file upload to S3 bucket
 */

const multer = require('multer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        key: function (req, file, cb) {
            cb(null, `profile_pics/${Date.now()}_${file.originalname}`);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = upload;
