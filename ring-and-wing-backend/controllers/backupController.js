const { runBackup, listBackups, getLatestStatus, getRetentionDays } = require('../utils/backupService');
const { logger } = require('../config/logger');

const run = async (req, res) => {
  try {
    const initiatedBy = {
      userId: req.user?._id,
      username: req.user?.username,
      position: req.user?.position
    };
    const manifest = await runBackup(initiatedBy);
    return res.json({ success: true, data: manifest });
  } catch (error) {
    logger.error('[Backup] Run failed:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const status = async (_req, res) => {
  try {
    const latest = await getLatestStatus();
    return res.json({ success: true, data: latest, retentionDays: getRetentionDays() });
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
