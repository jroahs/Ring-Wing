const supabase = require('../config/supabase');
const path = require('path');

/**
 * Upload file to Supabase Storage
 * @param {string} bucket - Bucket name
 * @param {string} filePath - Path within bucket
 * @param {Buffer|File} file - File to upload
 * @param {object} options - Upload options
 * @returns {Promise<object>} - Upload result data
 */
async function uploadFile(bucket, filePath, file, options = {}) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: options.cacheControl || '3600',
        upsert: options.upsert || false,
        contentType: options.contentType
      });

    if (error) {
      console.error(`[Supabase Storage] Upload error for ${bucket}/${filePath}:`, error);
      throw error;
    }

    console.log(`[Supabase Storage] Successfully uploaded to ${bucket}/${filePath}`);
    return data;
  } catch (error) {
    console.error('[Supabase Storage] Upload failed:', error);
    throw error;
  }
}

/**
 * Get public URL for a file
 * @param {string} bucket - Bucket name
 * @param {string} filePath - Path within bucket
 * @returns {string} - Public URL to the file
 */
function getPublicUrl(bucket, filePath) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  console.log(`[Supabase Storage] Generated public URL for ${bucket}/${filePath}`);
  return data.publicUrl;
}

/**
 * Get signed URL for private files (expires after specified time)
 * @param {string} bucket - Bucket name
 * @param {string} filePath - Path within bucket
 * @param {number} expiresIn - Expiration time in seconds (default 3600 = 1 hour)
 * @returns {Promise<string>} - Signed URL
 */
async function getSignedUrl(bucket, filePath, expiresIn = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error(`[Supabase Storage] Signed URL error for ${bucket}/${filePath}:`, error);
      throw error;
    }

    console.log(`[Supabase Storage] Generated signed URL for ${bucket}/${filePath}`);
    return data.signedUrl;
  } catch (error) {
    console.error('[Supabase Storage] Failed to create signed URL:', error);
    throw error;
  }
}

/**
 * Delete file from Supabase Storage
 * @param {string} bucket - Bucket name
 * @param {string} filePath - Path within bucket
 * @returns {Promise<object>} - Delete result
 */
async function deleteFile(bucket, filePath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error(`[Supabase Storage] Delete error for ${bucket}/${filePath}:`, error);
      throw error;
    }

    console.log(`[Supabase Storage] Successfully deleted ${bucket}/${filePath}`);
    return data;
  } catch (error) {
    console.error('[Supabase Storage] Delete failed:', error);
    throw error;
  }
}

/**
 * Generate unique filename with timestamp and random string
 * @param {string} originalName - Original filename
 * @param {string} prefix - Prefix for filename (e.g., item code, staff ID)
 * @returns {string} - Unique filename
 */
function generateUniqueFilename(originalName, prefix = '') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const ext = path.extname(originalName).toLowerCase();
  
  if (prefix) {
    return `${prefix}-${timestamp}-${random}${ext}`;
  }
  
  return `${timestamp}-${random}${ext}`;
}

/**
 * Extract Supabase path from full URL
 * @param {string} url - Full Supabase URL
 * @returns {object} - Object with bucket and filePath
 */
function parseSupabaseUrl(url) {
  try {
    if (!url || !url.includes('supabase.co')) {
      return null;
    }

    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // URL format: /storage/v1/object/public/{bucket}/{path}
    // or: /storage/v1/object/sign/{bucket}/{path}
    const objectIndex = pathParts.indexOf('object');
    if (objectIndex === -1) return null;

    const bucket = pathParts[objectIndex + 2]; // Skip 'public' or 'sign'
    const filePath = pathParts.slice(objectIndex + 3).join('/');

    return { bucket, filePath };
  } catch (error) {
    console.error('[Supabase Storage] Error parsing URL:', error);
    return null;
  }
}

/**
 * List files in a bucket path
 * @param {string} bucket - Bucket name
 * @param {string} folderPath - Path within bucket (optional)
 * @param {object} options - List options (limit, offset, sortBy)
 * @returns {Promise<Array>} - List of files
 */
async function listFiles(bucket, folderPath = '', options = {}) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folderPath, {
        limit: options.limit || 100,
        offset: options.offset || 0,
        sortBy: options.sortBy || { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error(`[Supabase Storage] List error for ${bucket}/${folderPath}:`, error);
      throw error;
    }

    console.log(`[Supabase Storage] Listed ${data.length} files in ${bucket}/${folderPath}`);
    return data;
  } catch (error) {
    console.error('[Supabase Storage] List failed:', error);
    throw error;
  }
}

/**
 * Check if a file exists in storage
 * @param {string} bucket - Bucket name
 * @param {string} filePath - Path within bucket
 * @returns {Promise<boolean>} - True if file exists
 */
async function fileExists(bucket, filePath) {
  try {
    const folderPath = path.dirname(filePath);
    const fileName = path.basename(filePath);
    
    const files = await listFiles(bucket, folderPath === '.' ? '' : folderPath);
    return files.some(file => file.name === fileName);
  } catch (error) {
    console.error('[Supabase Storage] File exists check failed:', error);
    return false;
  }
}

module.exports = {
  uploadFile,
  getPublicUrl,
  getSignedUrl,
  deleteFile,
  generateUniqueFilename,
  parseSupabaseUrl,
  listFiles,
  fileExists
};
