/**
 * MongoDB Export Backup - Works with Free Tier (M0)
 * 
 * This module exports all collections from MongoDB as JSON files
 * and uploads them to Supabase Storage. This is a workaround for
 * M0 Free Tier clusters which don't support Cloud Backup snapshots.
 */

const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const { logger } = require('../config/logger');
const supabase = require('../config/supabase');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

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
 * @param {string} backupId - Unique backup identifier
 * @param {Function} progressCallback - Optional callback for progress updates
 */
const runMongoExportBackup = async (backupId, progressCallback = null) => {
  const results = {
    mode: 'mongo-export',
    collections: [],
    totalDocuments: 0,
    totalSize: 0,
    errors: []
  };

  const reportProgress = (data) => {
    if (progressCallback) {
      progressCallback(data);
    }
  };
  
  try {
    // Wait for MongoDB connection if not ready
    if (mongoose.connection.readyState !== 1) {
      logger.warn('[MongoExport] MongoDB not connected, waiting...');
      reportProgress({ step: 'Waiting for database connection...', percent: 5, details: 'Connecting to MongoDB' });
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('MongoDB connection timeout')), 10000);
        mongoose.connection.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
    
    const collectionNames = await getCollectionNames();
    const totalCollections = collectionNames.length;
    logger.info(`[MongoExport] Found ${totalCollections} collections to export`);
    
    reportProgress({ 
      step: 'Exporting database', 
      percent: 10, 
      details: `Found ${totalCollections} collections`,
      totalCollections,
      collectionsCompleted: 0
    });
    
    // Export each collection
    for (let i = 0; i < collectionNames.length; i++) {
      const collectionName = collectionNames[i];
      try {
        const percent = Math.round(10 + (i / totalCollections) * 40); // 10-50% for DB export
        reportProgress({ 
          step: 'Exporting database', 
          percent, 
          currentCollection: collectionName,
          collectionsCompleted: i,
          totalCollections,
          details: `Exporting ${collectionName} (${i + 1}/${totalCollections})`
        });
        
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
    
    reportProgress({ 
      step: 'Saving manifest', 
      percent: 50, 
      collectionsCompleted: totalCollections,
      totalCollections,
      details: 'Creating backup manifest...'
    });
    
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
 * Restore a single collection from a backup file
 * Uses upsert to avoid duplicates when not dropping existing data
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
    const buffer = Buffer.from(await data.arrayBuffer());
    const decompressed = await gunzip(buffer);
    const exportData = JSON.parse(decompressed.toString('utf-8'));
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB not connected');
    }
    
    const collection = db.collection(collectionName);
    
    // Helper to convert _id strings back to ObjectId
    const convertIds = (doc) => {
      const converted = { ...doc };
      // Convert _id if it's a valid ObjectId string
      if (converted._id && typeof converted._id === 'string' && ObjectId.isValid(converted._id)) {
        converted._id = new ObjectId(converted._id);
      } else if (converted._id && typeof converted._id === 'object' && converted._id.$oid) {
        // Handle MongoDB Extended JSON format
        converted._id = new ObjectId(converted._id.$oid);
      }
      return converted;
    };
    
    // Optionally drop existing collection
    if (dropExisting) {
      await collection.drop().catch(() => {}); // Ignore error if collection doesn't exist
      // After dropping, just insert all documents
      if (exportData.data && exportData.data.length > 0) {
        const docsWithIds = exportData.data.map(convertIds);
        await collection.insertMany(docsWithIds, { ordered: false });
      }
    } else {
      // Use bulkWrite with upsert to update existing or insert new
      if (exportData.data && exportData.data.length > 0) {
        const bulkOps = exportData.data.map(doc => {
          const converted = convertIds(doc);
          return {
            replaceOne: {
              filter: { _id: converted._id },
              replacement: converted,
              upsert: true
            }
          };
        });
        
        await collection.bulkWrite(bulkOps, { ordered: false });
      }
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
 * Restore from a full backup
 * @param {string} backupId - Backup ID to restore from
 * @param {Object} options - Restore options
 * @param {Array} options.collections - Specific collections to restore (null for all)
 * @param {boolean} options.dropExisting - Whether to drop existing collections before restore
 * @param {Function} options.progressCallback - Progress callback function
 */
const restoreFromBackup = async (backupId, options = {}) => {
  const { collections = null, dropExisting = false, progressCallback = null } = options;
  
  const results = {
    backupId,
    restoredAt: new Date().toISOString(),
    collections: [],
    totalDocuments: 0,
    errors: [],
    success: true
  };

  const reportProgress = (data) => {
    if (progressCallback) {
      progressCallback(data);
    }
  };

  try {
    reportProgress({ step: 'Loading backup manifest...', percent: 5 });
    
    // First, download the manifest to see what collections are available
    const manifestPath = `db/${backupId}/manifest.json`;
    const { data: manifestData, error: manifestError } = await supabase.storage
      .from(BACKUP_BUCKET)
      .download(manifestPath);
    
    if (manifestError) {
      throw new Error(`Failed to load backup manifest: ${manifestError.message}`);
    }
    
    const manifestBuffer = Buffer.from(await manifestData.arrayBuffer());
    const manifest = JSON.parse(manifestBuffer.toString('utf-8'));
    
    // Determine which collections to restore
    const availableCollections = manifest.collections.map(c => c.name);
    const collectionsToRestore = collections 
      ? collections.filter(c => availableCollections.includes(c))
      : availableCollections;
    
    if (collectionsToRestore.length === 0) {
      throw new Error('No collections found to restore');
    }
    
    logger.info(`[MongoRestore] Restoring ${collectionsToRestore.length} collections from backup ${backupId}`);
    reportProgress({ 
      step: 'Restoring collections', 
      percent: 10, 
      details: `Found ${collectionsToRestore.length} collections to restore`,
      totalCollections: collectionsToRestore.length,
      collectionsCompleted: 0
    });
    
    // Restore each collection
    for (let i = 0; i < collectionsToRestore.length; i++) {
      const collectionName = collectionsToRestore[i];
      const percent = Math.round(10 + (i / collectionsToRestore.length) * 85);
      
      reportProgress({ 
        step: 'Restoring collections', 
        percent, 
        currentCollection: collectionName,
        collectionsCompleted: i,
        totalCollections: collectionsToRestore.length,
        details: `Restoring ${collectionName} (${i + 1}/${collectionsToRestore.length})`
      });
      
      const result = await restoreCollection(backupId, collectionName, { dropExisting });
      
      if (result.success) {
        results.collections.push({
          name: collectionName,
          documentCount: result.documentCount
        });
        results.totalDocuments += result.documentCount;
        logger.info(`[MongoRestore] Restored ${collectionName}: ${result.documentCount} documents`);
      } else {
        results.errors.push({
          collection: collectionName,
          error: result.error
        });
        results.success = false;
        logger.error(`[MongoRestore] Failed to restore ${collectionName}: ${result.error}`);
      }
    }
    
    reportProgress({ 
      step: 'Restore complete', 
      percent: 100, 
      collectionsCompleted: collectionsToRestore.length,
      totalCollections: collectionsToRestore.length,
      details: `Restored ${results.totalDocuments} documents in ${results.collections.length} collections`
    });
    
    results.success = results.errors.length === 0;
    
  } catch (err) {
    logger.error(`[MongoRestore] Restore failed: ${err.message}`);
    results.error = err.message;
    results.success = false;
  }
  
  return results;
};

/**
 * List available database backups with details
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
  
  // Filter to only include folders (backup IDs) and get details
  const backupFolders = data?.filter(item => item.id === null) || [];
  
  const backups = [];
  for (const folder of backupFolders) {
    try {
      // Try to load manifest for details
      const manifestPath = `db/${folder.name}/manifest.json`;
      const { data: manifestData, error: manifestError } = await supabase.storage
        .from(BACKUP_BUCKET)
        .download(manifestPath);
      
      if (!manifestError && manifestData) {
        const buffer = Buffer.from(await manifestData.arrayBuffer());
        const manifest = JSON.parse(buffer.toString('utf-8'));
        backups.push({
          id: folder.name,
          exportedAt: manifest.exportedAt,
          databaseName: manifest.databaseName,
          collectionCount: manifest.collections?.length || 0,
          totalDocuments: manifest.totalDocuments || 0,
          totalSize: manifest.totalCompressedSize || 0
        });
      } else {
        backups.push({
          id: folder.name,
          exportedAt: null,
          collectionCount: 0,
          totalDocuments: 0
        });
      }
    } catch (err) {
      backups.push({
        id: folder.name,
        error: err.message
      });
    }
  }
  
  // Sort by date descending
  backups.sort((a, b) => {
    if (!a.exportedAt) return 1;
    if (!b.exportedAt) return -1;
    return new Date(b.exportedAt) - new Date(a.exportedAt);
  });
  
  return backups;
};

/**
 * Get backup details including available collections
 */
const getBackupDetails = async (backupId) => {
  const manifestPath = `db/${backupId}/manifest.json`;
  const { data, error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .download(manifestPath);
  
  if (error) {
    throw new Error(`Failed to load backup: ${error.message}`);
  }
  
  const buffer = Buffer.from(await data.arrayBuffer());
  return JSON.parse(buffer.toString('utf-8'));
};

/**
 * Delete all data from all collections (DANGEROUS - use with caution!)
 * Keeps the collection structure but removes all documents
 * @param {Array} excludeCollections - Collections to exclude from deletion
 */
const deleteAllData = async (excludeCollections = ['users', 'sessions']) => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB not connected');
  }
  
  const collectionNames = await getCollectionNames();
  const results = {
    deletedCollections: [],
    skippedCollections: [],
    totalDeleted: 0,
    errors: []
  };
  
  for (const collectionName of collectionNames) {
    // Skip system collections and excluded collections
    if (collectionName.startsWith('system.') || excludeCollections.includes(collectionName)) {
      results.skippedCollections.push(collectionName);
      continue;
    }
    
    try {
      const collection = db.collection(collectionName);
      const deleteResult = await collection.deleteMany({});
      results.deletedCollections.push({
        name: collectionName,
        deletedCount: deleteResult.deletedCount
      });
      results.totalDeleted += deleteResult.deletedCount;
      logger.info(`[DeleteAllData] Deleted ${deleteResult.deletedCount} documents from ${collectionName}`);
    } catch (err) {
      results.errors.push({
        collection: collectionName,
        error: err.message
      });
      logger.error(`[DeleteAllData] Failed to delete from ${collectionName}: ${err.message}`);
    }
  }
  
  results.success = results.errors.length === 0;
  return results;
};

module.exports = {
  runMongoExportBackup,
  restoreCollection,
  restoreFromBackup,
  listDatabaseBackups,
  getBackupDetails,
  getCollectionNames,
  exportCollection,
  deleteAllData
};
