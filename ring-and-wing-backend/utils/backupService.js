const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { logger } = require('../config/logger');
const supabase = require('../config/supabase');
const { getLatestSnapshot } = require('./atlasBackup');

const BACKUP_BUCKET = 'backups';
const DEFAULT_RETENTION_DAYS = 14;
const BUCKETS_TO_BACKUP = ['menu-items', 'merchant-qr-codes', 'staff-profiles', 'payment-proofs', 'timelogs'];

const ensureSupabaseConfigured = () => {
  if (!supabase?.storage) {
    throw new Error('Supabase is not configured. Check SUPABASE_URL and SUPABASE_SECRET_KEY.');
  }
};

const getRetentionDays = () => {
  const raw = process.env.BACKUP_RETENTION_DAYS;
  const parsed = raw ? parseInt(raw, 10) : DEFAULT_RETENTION_DAYS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
};

const timestampId = () => new Date().toISOString().replace(/[:.]/g, '-');

const maskMongoUri = (uri = '') => {
  if (!uri) return '';
  try {
    const url = new URL(uri);
    const maskedAuth = url.username ? `${url.username}:***@` : '';
    return `${url.protocol}//${maskedAuth}${url.host}${url.pathname}`;
  } catch (err) {
    return uri.replace(/:\w+@/, ':***@');
  }
};

const useAtlasBackup = () => (
  process.env.ATLAS_PUBLIC_KEY &&
  process.env.ATLAS_PRIVATE_KEY &&
  process.env.ATLAS_PROJECT_ID &&
  process.env.ATLAS_CLUSTER_NAME
);

const runMongoDump = (mongoUri, archiveName) => new Promise((resolve, reject) => {
  const archivePath = path.join(os.tmpdir(), archiveName);
  logger.info(`[Backup] Starting mongodump to ${archivePath}`);

  const dump = spawn('mongodump', [
    `--uri=${mongoUri}`,
    '--gzip',
    `--archive=${archivePath}`
  ]);

  dump.on('error', (err) => {
    if (err.code === 'ENOENT') {
      reject(new Error('mongodump not found in PATH. Please install MongoDB Database Tools or add mongodump to PATH on the server.'));
    } else {
      reject(err);
    }
  });

  dump.stdout.on('data', (data) => logger.debug(`[Backup][mongodump] ${data}`));
  dump.stderr.on('data', (data) => logger.warn(`[Backup][mongodump] ${data}`));

  dump.on('close', (code) => {
    if (code === 0) {
      const size = fs.existsSync(archivePath) ? fs.statSync(archivePath).size : 0;
      logger.info(`[Backup] mongodump finished (${size} bytes)`);
      resolve({ archivePath, size });
    } else {
      reject(new Error(`mongodump exited with code ${code}`));
    }
  });
});

const listAllFiles = async (bucket, prefix = '') => {
  ensureSupabaseConfigured();
  const files = [];
  const pageSize = 100;

  const walk = async (currentPrefix, currentOffset = 0) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(currentPrefix, { limit: pageSize, offset: currentOffset });

    if (error) throw new Error(`List failed for ${bucket}/${currentPrefix}: ${error.message}`);
    if (!data) return;

    for (const item of data) {
      const isFolder = item.id === null;
      if (isFolder) {
        const nextPrefix = currentPrefix ? `${currentPrefix}/${item.name}` : item.name;
        await walk(nextPrefix, 0);
      } else {
        const filePath = currentPrefix ? `${currentPrefix}/${item.name}` : item.name;
        files.push({
          path: filePath,
          size: item.metadata?.size || item.size || 0,
          updatedAt: item.updated_at
        });
      }
    }

    if (data.length === pageSize) {
      await walk(currentPrefix, currentOffset + pageSize);
    }
  };

  await walk(prefix, 0);
  return files;
};

const downloadFile = async (bucket, filePath) => {
  const { data, error } = await supabase.storage.from(bucket).download(filePath);
  if (error) throw new Error(`Download failed for ${bucket}/${filePath}: ${error.message}`);
  if (!data) throw new Error(`No data returned for ${bucket}/${filePath}`);

  if (Buffer.isBuffer(data)) return data;

  if (typeof data.arrayBuffer === 'function') {
    const buffer = Buffer.from(await data.arrayBuffer());
    return buffer;
  }

  if (typeof data.getReader !== 'function' && typeof data.pipe === 'function') {
    const chunks = [];
    for await (const chunk of data) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  throw new Error(`Unsupported download data type for ${bucket}/${filePath}`);
};

const uploadToBackup = async (targetPath, buffer, contentType = 'application/octet-stream') => {
  const { error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .upload(targetPath, buffer, { upsert: true, contentType });

  if (error) throw new Error(`Upload failed for ${targetPath}: ${error.message}`);
};

const copyBucket = async (sourceBucket, backupPrefix) => {
  const files = await listAllFiles(sourceBucket);
  let totalBytes = 0;

  for (const file of files) {
    const dataBuffer = await downloadFile(sourceBucket, file.path);
    totalBytes += dataBuffer.length;
    const targetPath = `${backupPrefix}/${sourceBucket}/${file.path}`;
    await uploadToBackup(targetPath, dataBuffer);
  }

  return { fileCount: files.length, totalBytes };
};

const copyLocalDirectory = async (dirPath, backupPrefix) => {
  if (!fs.existsSync(dirPath)) return { fileCount: 0, totalBytes: 0 };

  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  let totalBytes = 0;
  let fileCount = 0;

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const subResult = await copyLocalDirectory(fullPath, `${backupPrefix}/${entry.name}`);
      totalBytes += subResult.totalBytes;
      fileCount += subResult.fileCount;
    } else if (entry.isFile()) {
      const buffer = await fs.promises.readFile(fullPath);
      totalBytes += buffer.length;
      fileCount += 1;
      await uploadToBackup(`${backupPrefix}/${entry.name}`, buffer, 'text/plain');
    }
  }

  return { fileCount, totalBytes };
};

const enforceRetention = async (retentionDays) => {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const { data, error } = await supabase.storage.from(BACKUP_BUCKET).list('manifests', { limit: 200 });
  if (error) throw new Error(`Failed to list manifests: ${error.message}`);
  if (!data) return;

  for (const item of data) {
    if (!item.name) continue;
    const manifestPath = `manifests/${item.name}`;
    try {
      const manifestBuffer = await downloadFile(BACKUP_BUCKET, manifestPath);
      const manifest = JSON.parse(manifestBuffer.toString());
      const createdTime = manifest?.startedAt ? new Date(manifest.startedAt).getTime() : NaN;

      if (!createdTime || createdTime >= cutoff) continue;

      if (manifest.mongo?.archivePath) {
        const dbPath = manifest.mongo.archivePath.replace(`${BACKUP_BUCKET}/`, '');
        await supabase.storage.from(BACKUP_BUCKET).remove([dbPath]);
      }

      if (manifest.storage?.prefix) {
        const storageFiles = await listAllFiles(BACKUP_BUCKET, manifest.storage.prefix.replace(`${BACKUP_BUCKET}/`, ''));
        if (storageFiles.length) {
          await supabase.storage.from(BACKUP_BUCKET).remove(storageFiles.map((f) => f.path));
        }
      }

      if (manifest.logs?.prefix) {
        const logFiles = await listAllFiles(BACKUP_BUCKET, manifest.logs.prefix.replace(`${BACKUP_BUCKET}/`, ''));
        if (logFiles.length) {
          await supabase.storage.from(BACKUP_BUCKET).remove(logFiles.map((f) => f.path));
        }
      }

      await supabase.storage.from(BACKUP_BUCKET).remove([manifestPath]);
      logger.info(`[Backup] Pruned old backup ${manifest.id}`);
    } catch (err) {
      logger.warn(`[Backup] Failed to prune ${item.name}: ${err.message}`);
    }
  }
};

const runBackup = async (initiatedBy = {}) => {
  ensureSupabaseConfigured();
  const id = timestampId();
  const retentionDays = getRetentionDays();
  let partial = false;

  const manifest = {
    id,
    startedAt: new Date().toISOString(),
    status: 'running',
    initiatedBy,
    retentionDays,
    mongo: {},
    storage: {},
    logs: {}
  };

  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI is not set.');

    const dbName = mongoUri.split('/').pop()?.split('?')[0] || 'database';

    if (useAtlasBackup()) {
      logger.info('[Backup] Using MongoDB Atlas snapshot metadata instead of mongodump');
      const snapshot = await getLatestSnapshot();
      manifest.mongo = {
        mode: 'atlas-snapshot',
        dbName,
        snapshot,
        uri: maskMongoUri(mongoUri)
      };
      if (!snapshot) {
        partial = true;
        manifest.mongo.warning = 'No Atlas snapshot found';
      }
    } else {
      try {
        const archiveName = `${dbName}-${id}.gz`;
        const { archivePath, size } = await runMongoDump(mongoUri, archiveName);
        const dbTargetPath = `db/${archiveName}`;
        const dbBuffer = await fs.promises.readFile(archivePath);
        await uploadToBackup(dbTargetPath, dbBuffer, 'application/gzip');
        manifest.mongo = {
          mode: 'mongodump',
          dbName,
          archivePath: `backups/${dbTargetPath}`,
          size,
          uri: maskMongoUri(mongoUri)
        };
      } catch (err) {
        if (err.message?.toLowerCase().includes('mongodump not found')) {
          partial = true;
          manifest.mongo = {
            mode: 'mongodump',
            error: err.message,
            uri: maskMongoUri(mongoUri)
          };
          logger.warn('[Backup] Skipping DB dump; mongodump not available. Storage/logs will still be backed up.');
        } else {
          throw err;
        }
      }
    }

    const storagePrefix = `storage/${id}`;
    try {
      let totalFiles = 0;
      let totalBytes = 0;
      for (const bucket of BUCKETS_TO_BACKUP) {
        const result = await copyBucket(bucket, storagePrefix);
        totalFiles += result.fileCount;
        totalBytes += result.totalBytes;
      }
      manifest.storage = {
        buckets: BUCKETS_TO_BACKUP,
        prefix: `backups/${storagePrefix}`,
        totalFiles,
        totalBytes
      };
    } catch (err) {
      partial = true;
      manifest.storage = {
        buckets: BUCKETS_TO_BACKUP,
        prefix: `backups/${storagePrefix}`,
        error: err.message
      };
      logger.error('[Backup] Storage copy failed:', err);
    }

    const logsDir = path.join(__dirname, '..', 'logs');
    const reportsDir = path.join(__dirname, '..', 'reports');
    const logsPrefix = `logs-reports/${id}`;
    try {
      const logsResult = await copyLocalDirectory(logsDir, `${logsPrefix}/logs`);
      const reportsResult = await copyLocalDirectory(reportsDir, `${logsPrefix}/reports`);
      manifest.logs = {
        prefix: `backups/${logsPrefix}`,
        fileCount: logsResult.fileCount + reportsResult.fileCount,
        totalBytes: logsResult.totalBytes + reportsResult.totalBytes
      };
    } catch (err) {
      partial = true;
      manifest.logs = {
        prefix: `backups/${logsPrefix}`,
        error: err.message
      };
      logger.error('[Backup] Logs/reports copy failed:', err);
    }

    manifest.completedAt = new Date().toISOString();
    manifest.status = partial ? 'partial' : 'success';
    const manifestPath = `manifests/${id}.json`;
    await uploadToBackup(manifestPath, Buffer.from(JSON.stringify(manifest, null, 2)), 'application/json');

    try {
      await enforceRetention(retentionDays);
    } catch (err) {
      logger.warn(`[Backup] Retention enforcement skipped: ${err.message}`);
    }

    return manifest;
  } catch (error) {
    manifest.status = 'failed';
    manifest.error = error.message;
    manifest.failedAt = new Date().toISOString();
    try {
      const manifestPath = `manifests/${id}.json`;
      await uploadToBackup(manifestPath, Buffer.from(JSON.stringify(manifest, null, 2)), 'application/json');
    } catch (err) {
      logger.error(`[Backup] Failed to write failure manifest: ${err.message}`);
    }
    logger.error('[Backup] Backup failed:', error);
    throw error;
  }
};

const listBackups = async () => {
  ensureSupabaseConfigured();
  const { data, error } = await supabase.storage.from(BACKUP_BUCKET).list('manifests', { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) throw new Error(`Failed to list backups: ${error.message}`);
  if (!data) return [];

  const items = [];
  for (const entry of data) {
    if (!entry.name) continue;
    const manifestPath = `manifests/${entry.name}`;
    try {
      const buffer = await downloadFile(BACKUP_BUCKET, manifestPath);
      const manifest = JSON.parse(buffer.toString());
      items.push({
        id: manifest.id,
        startedAt: manifest.startedAt,
        completedAt: manifest.completedAt,
        status: manifest.status,
        retentionDays: manifest.retentionDays,
        mongo: manifest.mongo,
        storage: manifest.storage,
        logs: manifest.logs,
        error: manifest.error
      });
    } catch (err) {
      logger.warn(`[Backup] Failed to read manifest ${manifestPath}: ${err.message}`);
    }
  }

  items.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  return items;
};

const getLatestStatus = async () => {
  const list = await listBackups();
  return list[0] || null;
};

module.exports = {
  runBackup,
  listBackups,
  getLatestStatus,
  getRetentionDays
};
