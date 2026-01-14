/**
 * R2 Upload Agent
 * Uploads generated scoreboard images to Cloudflare R2
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import { basename } from 'path';

// R2 configuration from environment
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

let client = null;

/**
 * Get or create R2 client
 * @returns {S3Client}
 */
function getClient() {
  if (!client) {
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
      throw new Error('Missing R2 credentials. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT');
    }
    client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

/**
 * Upload a file to R2
 * @param {string} localPath - Local file path
 * @param {string} r2Key - Key (path) in R2 bucket
 * @returns {Promise<object>} - Upload result with public URL
 */
export async function uploadToR2(localPath, r2Key) {
  const client = getClient();

  if (!R2_BUCKET_NAME) {
    throw new Error('R2_BUCKET_NAME not set');
  }

  console.log(`Uploading ${basename(localPath)} to R2...`);

  const fileBuffer = readFileSync(localPath);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
    Body: fileBuffer,
    ContentType: 'image/png',
  });

  await client.send(command);

  const publicUrl = R2_PUBLIC_URL
    ? `${R2_PUBLIC_URL}/${r2Key}`
    : `https://${R2_BUCKET_NAME}.r2.dev/${r2Key}`;

  console.log(`Uploaded to: ${publicUrl}`);

  return {
    success: true,
    key: r2Key,
    publicUrl,
  };
}

/**
 * Upload a scoreboard image to R2
 * @param {string} localPath - Local path to generated image
 * @returns {Promise<object>} - Upload result with public URL
 */
export async function uploadScoreboard(localPath) {
  // Extract date folder and filename from path
  // e.g., output/2026-01-14/michigan_st_vs_indiana_401825438.png
  const match = localPath.match(/output[\\\/](\d{4}-\d{2}-\d{2})[\\\/](.+\.png)$/);

  let r2Key;
  if (match) {
    const [, dateFolder, filename] = match;
    r2Key = `scoreboards/${dateFolder}/${filename}`;
  } else {
    r2Key = `scoreboards/${basename(localPath)}`;
  }

  return await uploadToR2(localPath, r2Key);
}

/**
 * Validate R2 configuration
 * @returns {object} - Validation result
 */
export function validateR2Config() {
  const issues = [];

  if (!R2_ACCESS_KEY_ID) issues.push('R2_ACCESS_KEY_ID not set');
  if (!R2_SECRET_ACCESS_KEY) issues.push('R2_SECRET_ACCESS_KEY not set');
  if (!R2_ENDPOINT) issues.push('R2_ENDPOINT not set');
  if (!R2_BUCKET_NAME) issues.push('R2_BUCKET_NAME not set');
  if (!R2_PUBLIC_URL) issues.push('R2_PUBLIC_URL not set (optional but recommended)');

  return {
    valid: issues.filter(i => !i.includes('optional')).length === 0,
    issues,
  };
}

// CLI: Test upload
if (process.argv[1] && process.argv[1].includes('r2.js')) {
  const validation = validateR2Config();
  console.log('R2 Config:', validation);

  const testPath = process.argv[2];
  if (testPath && validation.valid) {
    uploadScoreboard(testPath)
      .then(result => console.log('Result:', result))
      .catch(err => console.error('Error:', err.message));
  }
}
