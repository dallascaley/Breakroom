/**
 * Migration script to move existing uploaded files from local storage to S3
 * and update database paths accordingly.
 *
 * Usage: node scripts/migrate-to-s3.js
 *
 * Run this from the backend directory after setting up S3 environment variables.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { uploadToS3 } = require('../utilities/aws-s3');
const { getClient } = require('../utilities/db');

const uploadsDir = path.join(__dirname, '../uploads');

const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp'
};

async function migrateFiles() {
  console.log('Starting S3 migration...');
  console.log('Uploads directory:', uploadsDir);

  // Check if uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    console.log('No uploads directory found. Nothing to migrate.');
    return;
  }

  // Get all files in uploads directory
  const files = fs.readdirSync(uploadsDir);
  console.log(`Found ${files.length} files to migrate`);

  if (files.length === 0) {
    console.log('No files to migrate.');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const filename of files) {
    const filePath = path.join(uploadsDir, filename);
    const stat = fs.statSync(filePath);

    if (!stat.isFile()) {
      console.log(`Skipping non-file: ${filename}`);
      continue;
    }

    // Determine S3 key based on filename pattern
    let s3Key;
    if (filename.startsWith('profile_')) {
      s3Key = `profiles/${filename}`;
    } else if (filename.startsWith('chat_')) {
      s3Key = `chat/${filename}`;
    } else {
      console.log(`Skipping unknown file pattern: ${filename}`);
      continue;
    }

    // Read file and upload to S3
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    const result = await uploadToS3(buffer, s3Key, contentType);

    if (result.success) {
      console.log(`Migrated: ${filename} -> ${s3Key}`);
      successCount++;
    } else {
      console.error(`Failed: ${filename} - ${result.error}`);
      failCount++;
    }
  }

  console.log(`\nFile migration complete: ${successCount} succeeded, ${failCount} failed`);

  // Update database paths
  console.log('\nUpdating database paths...');

  const client = await getClient();
  try {
    // Update profile photos - prepend 'profiles/' to existing paths
    const profileResult = await client.query(`
      UPDATE users
      SET photo_path = CONCAT('profiles/', photo_path)
      WHERE photo_path IS NOT NULL
        AND photo_path NOT LIKE 'profiles/%'
    `);
    console.log(`Updated ${profileResult.rowCount || 0} profile photo paths`);

    // Update chat images - prepend 'chat/' to existing paths
    const chatResult = await client.query(`
      UPDATE chat_messages
      SET image_path = CONCAT('chat/', image_path)
      WHERE image_path IS NOT NULL
        AND image_path NOT LIKE 'chat/%'
    `);
    console.log(`Updated ${chatResult.rowCount || 0} chat image paths`);

    console.log('\nDatabase update complete!');
  } catch (err) {
    console.error('Database update error:', err);
  } finally {
    client.release();
  }

  console.log('\n=== Migration Summary ===');
  console.log(`Files migrated to S3: ${successCount}`);
  console.log(`Files failed: ${failCount}`);
  console.log('\nYou can now safely delete the local uploads directory after verifying images work.');
}

migrateFiles()
  .then(() => {
    console.log('\nMigration script finished.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
