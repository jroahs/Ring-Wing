const { runBackup, listBackups, getLatestStatus, getRetentionDays } = require('../utils/backupService');
const { restoreFromBackup, listDatabaseBackups, deleteAllData } = require('../utils/mongoExportBackup');
const { logger } = require('../config/logger');

// Track in-progress backup with detailed progress
let backupInProgress = false;
let lastBackupResult = null;
let backupProgress = {
  step: '',
  percent: 0,
  currentCollection: '',
  collectionsCompleted: 0,
  totalCollections: 0,
  details: ''
};

// Helper to emit backup progress via socket
const emitBackupProgress = (io, progress) => {
  if (io) {
    io.to('staff').emit('backup:progress', progress);
  }
};

// Helper to update and emit progress
const updateProgress = (io, updates) => {
  Object.assign(backupProgress, updates);
  emitBackupProgress(io, backupProgress);
};

const run = async (req, res) => {
  try {
    // Check if backup is already in progress
    if (backupInProgress) {
      return res.status(409).json({ 
        success: false, 
        message: 'A backup is already in progress. Please wait for it to complete.',
        inProgress: true,
        progress: backupProgress
      });
    }

    const io = req.app.get('io');
    const initiatedBy = {
      userId: req.user?._id,
      username: req.user?.username,
      position: req.user?.position
    };

    // Start backup asynchronously to avoid Render's 30s timeout
    backupInProgress = true;
    backupProgress = {
      step: 'Starting backup...',
      percent: 0,
      currentCollection: '',
      collectionsCompleted: 0,
      totalCollections: 0,
      details: 'Initializing backup process'
    };
    lastBackupResult = { status: 'running', startedAt: new Date().toISOString(), progress: backupProgress };

    // Emit initial progress
    emitBackupProgress(io, backupProgress);

    // Respond immediately
    res.json({ 
      success: true, 
      message: 'Backup started successfully. Check status endpoint for progress.',
      data: { status: 'running', startedAt: lastBackupResult.startedAt, progress: backupProgress }
    });

    // Run backup in background with progress callback
    try {
      const progressCallback = (progress) => {
        Object.assign(backupProgress, progress);
        lastBackupResult.progress = backupProgress;
        emitBackupProgress(io, backupProgress);
      };

      const manifest = await runBackup(initiatedBy, progressCallback);
      lastBackupResult = manifest;
      
      // Emit completion
      backupProgress = {
        step: 'Backup completed',
        percent: 100,
        currentCollection: '',
        collectionsCompleted: backupProgress.totalCollections,
        totalCollections: backupProgress.totalCollections,
        details: `Backup finished successfully at ${new Date().toISOString()}`
      };
      emitBackupProgress(io, backupProgress);
      
      // Emit final result
      if (io) {
        io.to('staff').emit('backup:complete', { success: true, data: manifest });
      }
      
      logger.info('[Backup] Backup completed successfully');
    } catch (error) {
      lastBackupResult = { 
        status: 'failed', 
        error: error.message, 
        failedAt: new Date().toISOString() 
      };
      
      backupProgress = {
        step: 'Backup failed',
        percent: 0,
        currentCollection: '',
        collectionsCompleted: 0,
        totalCollections: 0,
        details: error.message
      };
      
      // Emit failure
      if (io) {
        io.to('staff').emit('backup:complete', { success: false, error: error.message });
      }
      
      logger.error('[Backup] Background backup failed:', error);
    } finally {
      backupInProgress = false;
    }

  } catch (error) {
    backupInProgress = false;
    logger.error('[Backup] Run failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const status = async (_req, res) => {
  try {
    // If backup is in progress, return that status with progress
    if (backupInProgress) {
      return res.json({ 
        success: true, 
        data: lastBackupResult,
        inProgress: true,
        progress: backupProgress,
        retentionDays: getRetentionDays() 
      });
    }
    
    // Otherwise get latest from storage
    const latest = await getLatestStatus();
    return res.json({ success: true, data: latest, inProgress: false, progress: null, retentionDays: getRetentionDays() });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const list = async (_req, res) => {
  try {
    const backups = await listBackups();
    return res.json({ success: true, data: backups });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// NEW: Restore/Import endpoint
const restore = async (req, res) => {
  try {
    const { backupId, collections, dropExisting = false } = req.body;
    
    if (!backupId) {
      return res.status(400).json({ success: false, message: 'Backup ID is required' });
    }

    const io = req.app.get('io');
    const initiatedBy = {
      userId: req.user?._id,
      username: req.user?.username,
      position: req.user?.position
    };

    logger.info(`[Restore] Starting restore from backup ${backupId}`, { initiatedBy, collections, dropExisting });

    // Emit start
    if (io) {
      io.to('staff').emit('restore:progress', { step: 'Starting restore...', percent: 0 });
    }

    const result = await restoreFromBackup(backupId, {
      collections, // Optional: specific collections to restore
      dropExisting,
      progressCallback: (progress) => {
        if (io) {
          io.to('staff').emit('restore:progress', progress);
        }
      }
    });

    // Emit completion
    if (io) {
      io.to('staff').emit('restore:complete', { success: result.success, data: result });
    }

    return res.json({ success: result.success, data: result });
  } catch (error) {
    logger.error('[Restore] Restore failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// NEW: List available restore points (database backups)
const listRestorePoints = async (_req, res) => {
  try {
    const backups = await listDatabaseBackups();
    return res.json({ success: true, data: backups });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// NEW: Delete all database data (for cleanup before restore)
const deleteAll = async (req, res) => {
  try {
    const { excludeCollections = ['users', 'sessions'] } = req.body;
    
    const initiatedBy = {
      userId: req.user?._id,
      username: req.user?.username,
      position: req.user?.position
    };

    logger.warn(`[DeleteAll] User ${initiatedBy.username} initiated database deletion`, { initiatedBy, excludeCollections });

    const result = await deleteAllData(excludeCollections);

    logger.warn(`[DeleteAll] Deleted ${result.totalDeleted} documents from ${result.deletedCollections.length} collections`);

    return res.json({ success: result.success, data: result });
  } catch (error) {
    logger.error('[DeleteAll] Delete all failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { run, status, list, restore, listRestorePoints, deleteAll };
