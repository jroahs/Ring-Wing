const { runBackup, listBackups, getLatestStatus, getRetentionDays } = require('../utils/backupService');
const { logger } = require('../config/logger');

// Track in-progress backup
let backupInProgress = false;
let lastBackupResult = null;

const run = async (req, res) => {
  try {
    // Check if backup is already in progress
    if (backupInProgress) {
      return res.status(409).json({ 
        success: false, 
        message: 'A backup is already in progress. Please wait for it to complete.',
        inProgress: true
      });
    }

    const initiatedBy = {
      userId: req.user?._id,
      username: req.user?.username,
      position: req.user?.position
    };

    // Start backup asynchronously to avoid Render's 30s timeout
    backupInProgress = true;
    lastBackupResult = { status: 'running', startedAt: new Date().toISOString() };

    // Respond immediately
    res.json({ 
      success: true, 
      message: 'Backup started successfully. Check status endpoint for progress.',
      data: { status: 'running', startedAt: lastBackupResult.startedAt }
    });

    // Run backup in background
    try {
      const manifest = await runBackup(initiatedBy);
      lastBackupResult = manifest;
      logger.info('[Backup] Backup completed successfully');
    } catch (error) {
      lastBackupResult = { 
        status: 'failed', 
        error: error.message, 
        failedAt: new Date().toISOString() 
      };
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
    // If backup is in progress, return that status
    if (backupInProgress) {
      return res.json({ 
        success: true, 
        data: lastBackupResult,
        inProgress: true,
        retentionDays: getRetentionDays() 
      });
    }
    
    // Otherwise get latest from storage
    const latest = await getLatestStatus();
    return res.json({ success: true, data: latest, inProgress: false, retentionDays: getRetentionDays() });
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

module.exports = { run, status, list };
