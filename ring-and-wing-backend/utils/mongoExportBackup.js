/**
 * MongoDB Export Backup - Works with Free Tier (M0)
 * 
 * This module exports all collections from MongoDB as JSON files
 * and uploads them to Supabase Storage. This is a workaround for
 * M0 Free Tier clusters which don't support Cloud Backup snapshots.
 */

const mongoose = require('mongoose');
const { logger } = require('../config/logger');
const supabase = require('../config/supabase');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);

const BACKUP_BUCKET = 'backups';

/**
 * Get all collection names from the connected MongoDB database
 */
const getCollectionNames = async () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB not connected');
  }
  
  const collections = await db.listCollections().toArray();
  return collections.map(col => col.name);
};

/**
 * Export a single collection to JSON
 */
const exportCollection = async (collectionName) => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB not connected');
  }
  
  const collection = db.collection(collectionName);
  const documents = await collection.find({}).toArray();
  
  return {
    collectionName,
    documentCount: documents.length,
    data: documents,
    exportedAt: new Date().toISOString()
  };
};

/**
 * Compress data using gzip
 */
const compressData = async (data) => {
  const jsonString = JSON.stringify(data, null, 0); // Compact JSON
  const compressed = await gzip(Buffer.from(jsonString, 'utf-8'));
  return compressed;
};

/**
 * Upload backup file to Supabase Storage
 */
const uploadBackupFile = async (targetPath, buffer, contentType = 'application/gzip') => {
  if (!supabase?.storage) {
    throw new Error('Supabase is not configured');
  }
  
  const { error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .upload(targetPath, buffer, { upsert: true, contentType });

  if (error) {
    throw new Error(`Upload failed for ${targetPath}: ${error.message}`);
  }
};

/**
 * Run a full MongoDB export backup
 * Exports all collections as compressed JSON files
 */
const runMongoExportBackup = async (backupId) => {
  const results = {
    mode: 'mongo-export',
    collections: [],
    totalDocuments: 0,
    totalSize: 0,
    errors: []
  };
  
  try {
    // Wait for MongoDB connection if not ready
    if (mongoose.connection.readyState !== 1) {
      logger.warn('[MongoExport] MongoDB not connected, waiting...');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('MongoDB connection timeout')), 10000);
        mongoose.connection.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
    
    const collectionNames = await getCollectionNames();
    logger.info(`[MongoExport] Found ${collectionNames.length} collections to export`);
    
    // Export each collection
    for (const collectionName of collectionNames) {
      try {
        logger.info(`[MongoExport] Exporting collection: ${collectionName}`);
        
        const exportData = await exportCollection(collectionName);
        const compressed = await compressData(exportData);
        
        const targetPath = `db/${backupId}/${collectionName}.json.gz`;
        await uploadBackupFile(targetPath, compressed);
        
        results.collections.push({
          name: collectionName,
          documentCount: exportData.documentCount,
          compressedSize: compressed.length
        });
        
        results.totalDocuments += exportData.documentCount;
        results.totalSize += compressed.length;
        
        logger.info(`[MongoExport] Exported ${collectionName}: ${exportData.documentCount} docs, ${compressed.length} bytes compressed`);
        
      } catch (err) {
        logger.error(`[MongoExport] Failed to export ${collectionName}: ${err.message}`);
        results.errors.push({
          collection: collectionName,
          error: err.message
        });
      }
    }
    
    // Create a manifest for this database export
    const dbManifest = {
      backupId,
      exportedAt: new Date().toISOString(),
      databaseName: mongoose.connection.db?.databaseName || 'unknown',
      collections: results.collections,
      totalDocuments: results.totalDocuments,
      totalCompressedSize: results.totalSize
    };
    
    const manifestBuffer = Buffer.from(JSON.stringify(dbManifest, null, 2), 'utf-8');
    await uploadBackupFile(`db/${backupId}/manifest.json`, manifestBuffer, 'application/json');
    
    results.success = results.errors.length === 0;
    results.manifestPath = `db/${backupId}/manifest.json`;
    
  } catch (err) {
    logger.error(`[MongoExport] Backup failed: ${err.message}`);
    results.error = err.message;
    results.success = false;
  }
  
  return results;
};

/**
 * Restore a collection from a backup file
 */
const restoreCollection = async (backupId, collectionName, options = {}) => {
  const { dropExisting = false } = options;
  
  try {
    // Download the backup file
    const filePath = `db/${backupId}/${collectionName}.json.gz`;
    const { data, error } = await supabase.storage.from(BACKUP_BUCKET).download(filePath);
    
    if (error) {
      throw new Error(`Download failed: ${error.message}`);
    }
    
    // Decompress the data
    const gunzip = promisify(zlib.gunzip);
    const buffer = Buffer.from(await data.arrayBuffer());
    const decompressed = await gunzip(buffer);
    const exportData = JSON.parse(decompressed.toString('utf-8'));
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB not connected');
    }
    
    const collection = db.collection(collectionName);
    
    // Optionally drop existing collection
    if (dropExisting) {
      await collection.drop().catch(() => {}); // Ignore error if collection doesn't exist
    }
    
    // Insert the documents
    if (exportData.data && exportData.data.length > 0) {
      // Remove _id fields to avoid conflicts if not dropping
      const docsToInsert = dropExisting 
        ? exportData.data 
        : exportData.data.map(doc => {
            const { _id, ...rest } = doc;
            return rest;
          });
      
      await collection.insertMany(docsToInsert, { ordered: false });
    }
    
    return {
      success: true,
      collectionName,
      documentCount: exportData.data?.length || 0
    };
    
  } catch (err) {
    logger.error(`[MongoRestore] Failed to restore ${collectionName}: ${err.message}`);
    return {
      success: false,
      collectionName,
      error: err.message
    };
  }
};

/**
 * List available database backups
 */
const listDatabaseBackups = async () => {
  if (!supabase?.storage) {
    throw new Error('Supabase is not configured');
  }
  
  const { data, error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .list('db', { limit: 100 });
    
  if (error) {
    throw new Error(`Failed to list backups: ${error.message}`);
  }
  
  // Filter to only include folders (backup IDs)
  const backups = data
    ?.filter(item => item.id === null) // Folders have null id
    ?.map(item => item.name) || [];
    
  return backups;
};

module.exports = {
  runMongoExportBackup,
  restoreCollection,
  listDatabaseBackups,
  getCollectionNames,
  exportCollection
};
