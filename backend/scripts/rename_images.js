const pool = require('../config/database');
const path = require('path');
const fs = require('fs');

// This script renames car images to a standardized format (brand-model-year-id.ext)
// and updates the database accordingly.
//
// !!! WARNING !!!
// This is a destructive operation. It will rename files on your filesystem and update your database.
// PLEASE BACK UP YOUR DATABASE AND YOUR IMAGE FOLDER (e.g., 'frontend/images') BEFORE RUNNING THIS SCRIPT.
//
// How to run:
// 1. Save this file as `rename_images.js` inside a new `scripts` folder in your `backend` directory.
// 2. Open your terminal in the project root.
// 3. Run the script with: `node backend/scripts/rename_images.js`

const IMAGES_BASE_DIR = path.join(__dirname, '..', '..', 'frontend'); // Assumes script is in backend/scripts

function sanitize(str) {
  if (!str) return '';
  return str.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function renameCarImages() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✅ Connected to the database.');

    const [cars] = await connection.query('SELECT id, brand, model, year, image_url FROM cars WHERE image_url IS NOT NULL AND image_url != ""');
    console.log(`ℹ️ Found ${cars.length} cars with an image_url to process.`);

    for (const car of cars) {
      const logPrefix = `[Car ID: ${car.id}]`;

      if (!car.image_url || car.image_url.startsWith('http')) {
        console.log(`${logPrefix} ⏭️ Skipping external or empty image_url.`);
        continue;
      }

      const oldImageUrl = car.image_url;
      const extension = path.extname(oldImageUrl);
      if (!extension) {
        console.log(`${logPrefix} ⏭️ Skipping image with no extension: ${oldImageUrl}`);
        continue;
      }

      const newFilename = `${sanitize(car.brand)}-${sanitize(car.model)}-${car.year}-${car.id}${extension}`;
      
      const imageDir = path.dirname(oldImageUrl);
      // Use forward slashes for the URL path
      const newImageUrl = path.join(imageDir, newFilename).replace(/\\/g, '/');

      // Handle potential leading slash in image_url from the database
      const cleanOldUrl = oldImageUrl.startsWith('/') ? oldImageUrl.substring(1) : oldImageUrl;
      const cleanNewUrl = newImageUrl.startsWith('/') ? newImageUrl.substring(1) : newImageUrl;

      const oldFsPath = path.join(IMAGES_BASE_DIR, cleanOldUrl);
      const newFsPath = path.join(IMAGES_BASE_DIR, cleanNewUrl);

      if (oldFsPath === newFsPath) {
        console.log(`${logPrefix} ✅ Filename is already correct. Skipping.`);
        continue;
      }

      if (fs.existsSync(oldFsPath)) {
        try {
          fs.renameSync(oldFsPath, newFsPath);
          console.log(`${logPrefix} 👍 Renamed file to ${newFilename}`);

          await connection.query('UPDATE cars SET image_url = ? WHERE id = ?', [newImageUrl, car.id]);
          console.log(`${logPrefix} 💾 Database updated successfully.`);

        } catch (err) {
          console.error(`${logPrefix} ❌ ERROR renaming file:`, err.message);
        }
      } else {
        console.warn(`${logPrefix} ⚠️ WARNING: File not found at ${oldFsPath}. Skipping.`);
      }
    }

    console.log('\n✅ Image renaming process finished.');

  } catch (error) {
    console.error('❌ An unexpected error occurred during the process:', error);
  } finally {
    if (connection) connection.release();
    pool.end();
    console.log('ℹ️ Database connection closed.');
  }
}

renameCarImages();