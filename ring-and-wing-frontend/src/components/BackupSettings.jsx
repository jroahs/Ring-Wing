import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { FiDatabase, FiClock, FiRefreshCw, FiDownload, FiShield, FiUpload, FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { io } from 'socket.io-client';
import { API_URL } from '../App';
import { theme } from '../theme';

const formatDate = (value) => value ? new Date(value).toLocaleString() : '—';

const BackupSettings = () => {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [retentionDays, setRetentionDays] = useState(14);
  const [progress, setProgress] = useState(null);
  const [restorePoints, setRestorePoints] = useState([]);
  const [showRestore, setShowRestore] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const socketRef = useRef(null);

  const token = localStorage.getItem('authToken');

  // Socket.io connection for real-time progress
  useEffect(() => {
    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('backup:progress', (data) => {
      setProgress(data);
      setRunning(true);
    });

    socket.on('backup:complete', (result) => {
      setProgress(null);
      setRunning(false);
      if (result.success) {
        toast.success('Backup completed successfully!');
      } else {
        toast.error(`Backup failed: ${result.error}`);
      }
      fetchStatus();
      fetchList();
    });

    socket.on('restore:progress', (data) => {
      setRestoreProgress(data);
    });

    socket.on('restore:complete', (result) => {
      setRestoreProgress(null);
      setRestoring(false);
      if (result.success) {
        toast.success(`Restored ${result.data?.totalDocuments || 0} documents!`);
      } else {
        toast.error(`Restore failed: ${result.error}`);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/backups/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load backup status');
      setStatus(json.data);
      if (json.inProgress) {
        setRunning(true);
        setProgress(json.progress);
      }
      if (json.retentionDays) setRetentionDays(json.retentionDays);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const fetchList = async () => {
    try {
      const res = await fetch(`${API_URL}/api/backups/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load backups');
      setBackups(json.data || []);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const fetchRestorePoints = async () => {
    try {
      const res = await fetch(`${API_URL}/api/backups/restore-points`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) setRestorePoints(json.data || []);
    } catch (err) {
      console.error('Failed to fetch restore points:', err);
    }
  };

  const runBackup = async () => {
    try {
      setRunning(true);
      setProgress({ step: 'Starting...', percent: 0 });
      const res = await fetch(`${API_URL}/api/backups/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const json = await res.json();
      if (!json.success && !json.data?.status) throw new Error(json.message || 'Backup failed to start');
      toast.info('Backup started - watch progress below');
    } catch (err) {
      toast.error(err.message);
      setRunning(false);
      setProgress(null);
    }
  };

  const runRestore = async (backupId) => {
    if (!confirm(`Restore from backup?\n\nThis will UPDATE existing data and add new documents from the backup.\n\nContinue?`)) return;
    try {
      setRestoring(true);
      setRestoreProgress({ step: 'Starting restore...', percent: 0 });
      const res = await fetch(`${API_URL}/api/backups/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ backupId, dropExisting: false })
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || json.error || 'Restore failed');
      }
      toast.success(`Restored ${json.data?.totalDocuments || 0} documents successfully!`);
    } catch (err) {
      toast.error(err.message || 'Restore failed');
    } finally {
      setRestoring(false);
      setRestoreProgress(null);
    }
  };

  const deleteAllData = async () => {
    const confirmText = prompt(
      '⚠️ DANGER: This will DELETE ALL DATA from the database except users/sessions.\n\n' +
      'This action CANNOT be undone!\n\n' +
      'Type "DELETE ALL" to confirm:'
    );
    if (confirmText !== 'DELETE ALL') {
      if (confirmText !== null) toast.info('Deletion cancelled - text did not match');
      return;
    }
    try {
      setDeleting(true);
      const res = await fetch(`${API_URL}/api/backups/delete-all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ excludeCollections: ['users', 'sessions'] })
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || json.error || 'Delete failed');
      }
      toast.success(`Deleted ${json.data?.totalDeleted || 0} documents from ${json.data?.deletedCollections?.length || 0} collections`);
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchList(), fetchRestorePoints()]);
      setLoading(false);
    })();
  }, []);

  const accent = theme.colors.accent;
  const muted = theme.colors.muted;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: `${muted}30` }}>
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${accent}20`, color: accent }}>
          <FiDatabase />
        </div>
        <div>
          <h3 className="text-lg font-bold" style={{ color: theme.colors.primary }}>Backups</h3>
          <p className="text-sm" style={{ color: muted }}>Manual and scheduled backups for database, storage, logs, and reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg shadow-sm" style={{ border: `1px solid ${muted}30`, backgroundColor: 'white' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2" style={{ color: theme.colors.primary }}>
              <FiClock />
              <span className="font-semibold">Last Backup</span>
            </div>
            <span className="text-xs" style={{ color: muted }}>Retention: {retentionDays} days</span>
          </div>
          {/* Progress Bar */}
          {running && progress && (
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1" style={{ color: muted }}>
                <span>{progress.step || 'Processing...'}</span>
                <span>{progress.percent || 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${muted}30` }}>
                <div 
                  className="h-full transition-all duration-300" 
                  style={{ width: `${progress.percent || 0}%`, backgroundColor: accent }}
                />
              </div>
              {progress.currentCollection && (
                <p className="text-xs mt-1" style={{ color: muted }}>
                  {progress.details || `Collection: ${progress.currentCollection}`}
                </p>
              )}
            </div>
          )}
          {status ? (
            <div className="space-y-1 text-sm" style={{ color: theme.colors.primary }}>
              <div>Status: <span style={{ color: running ? accent : status.status === 'success' ? '#16a34a' : '#dc2626' }}>{running ? 'running' : status.status || 'unknown'}</span></div>
              <div>Started: {formatDate(status.startedAt)}</div>
              <div>Completed: {running ? '—' : formatDate(status.completedAt)}</div>
              <div>DB Archive: {status.mongo?.dbName || '—'}</div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: muted }}>No backups yet.</p>
          )}
        </div>

        <div className="p-4 rounded-lg shadow-sm" style={{ border: `1px solid ${muted}30`, backgroundColor: 'white' }}>
          <div className="flex items-center gap-2 mb-3" style={{ color: theme.colors.primary }}>
            <FiShield />
            <span className="font-semibold">Protected Actions</span>
          </div>
          <p className="text-sm" style={{ color: muted }}>Only admins can run or view backups. Data is stored in the private `backups` bucket.</p>
          <p className="text-sm mt-2" style={{ color: muted }}>Buckets included: menu-items, merchant-qr-codes, staff-profiles, payment-proofs, timelogs, plus logs/reports.</p>
        </div>

        <div className="p-4 rounded-lg shadow-sm flex flex-col" style={{ border: `1px solid ${muted}30`, backgroundColor: 'white' }}>
          <div className="flex items-center gap-2 mb-3" style={{ color: theme.colors.primary }}>
            <FiRefreshCw />
            <span className="font-semibold">Manual Backup</span>
          </div>
          <p className="text-sm mb-3" style={{ color: muted }}>Runs a full database dump and copies storage/logs to the private backup bucket.</p>
          <button
            onClick={runBackup}
            disabled={running || loading}
            className={`mt-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white ${running ? 'opacity-70' : ''}`}
            style={{ backgroundColor: accent }}
          >
            {running ? 'Running…' : 'Run Backup Now'}
          </button>
        </div>
      </div>

      <div className="p-4 rounded-lg shadow-sm" style={{ border: `1px solid ${muted}30`, backgroundColor: 'white' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2" style={{ color: theme.colors.primary }}>
            <FiDownload />
            <span className="font-semibold">Recent Backups</span>
          </div>
          <button
            onClick={() => setShowRestore(!showRestore)}
            className="text-xs px-3 py-1 rounded-md"
            style={{ backgroundColor: `${accent}20`, color: accent }}
          >
            {showRestore ? 'Hide Restore' : 'Show Restore Options'}
          </button>
        </div>
        {loading ? (
          <p className="text-sm" style={{ color: muted }}>Loading backups…</p>
        ) : backups && backups.length ? (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: muted, textAlign: 'left' }}>
                  <th className="py-2">Started</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">DB</th>
                  <th className="py-2">Files</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody style={{ color: theme.colors.primary }}>
                {backups.map((b) => (
                  <tr key={b.id} className="border-t" style={{ borderColor: `${muted}30` }}>
                    <td className="py-2">{formatDate(b.startedAt)}</td>
                    <td className="py-2" style={{ color: b.status === 'success' ? '#16a34a' : '#dc2626' }}>{b.status}</td>
                    <td className="py-2">{b.mongo?.dbName || '—'}</td>
                    <td className="py-2">{b.storage?.totalFiles ?? 0} files</td>
                    <td className="py-2">{b.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm" style={{ color: muted }}>No backups yet.</p>
        )}
      </div>

      {/* Restore Section */}
      {showRestore && (
        <div className="p-4 rounded-lg shadow-sm" style={{ border: `1px solid ${muted}30`, backgroundColor: 'white' }}>
          <div className="flex items-center gap-2 mb-3" style={{ color: theme.colors.primary }}>
            <FiUpload />
            <span className="font-semibold">Restore from Backup</span>
          </div>
          
          {/* Restore Progress */}
          {restoring && restoreProgress && (
            <div className="mb-4 p-3 rounded-md" style={{ backgroundColor: `${accent}10`, border: `1px solid ${muted}20` }}>
              <div className="flex justify-between text-xs mb-1" style={{ color: muted }}>
                <span>{restoreProgress.step || 'Restoring...'}</span>
                <span>{restoreProgress.percent || 0}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${muted}30` }}>
                <div 
                  className="h-full transition-all duration-300" 
                  style={{ width: `${restoreProgress.percent || 0}%`, backgroundColor: '#16a34a' }}
                />
              </div>
              {restoreProgress.details && (
                <p className="text-xs mt-1" style={{ color: muted }}>{restoreProgress.details}</p>
              )}
            </div>
          )}

          <p className="text-sm mb-3" style={{ color: muted }}>
            Restore will update existing data and insert new documents from the backup. No duplicates will be created.
          </p>
          
          {restorePoints.length > 0 ? (
            <div className="space-y-2">
              {restorePoints.slice(0, 5).map((rp) => (
                <div key={rp.id} className="flex items-center justify-between p-3 rounded-md" style={{ backgroundColor: 'white', border: `1px solid ${muted}30` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: theme.colors.primary }}>{formatDate(rp.exportedAt)}</p>
                    <p className="text-xs" style={{ color: muted }}>
                      {rp.collectionCount} collections • {rp.totalDocuments} documents
                    </p>
                  </div>
                  <button
                    onClick={() => runRestore(rp.id)}
                    disabled={restoring}
                    className="px-3 py-1 text-xs rounded-md text-white"
                    style={{ backgroundColor: restoring ? muted : '#16a34a' }}
                  >
                    {restoring ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: muted }}>No restore points available.</p>
          )}

          {/* Danger Zone - Delete All */}
          <div className="mt-6 pt-4 border-t" style={{ borderColor: `${muted}30` }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: '#dc2626' }}>
              <FiAlertTriangle />
              <span className="font-semibold text-sm">Danger Zone</span>
            </div>
            <p className="text-xs mb-3" style={{ color: muted }}>
              If you have duplicate data from a failed restore, use this to clear all data then restore from a clean backup.
            </p>
            <button
              onClick={deleteAllData}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm"
              style={{ backgroundColor: deleting ? muted : '#dc2626' }}
            >
              <FiTrash2 />
              {deleting ? 'Deleting...' : 'Delete All Data'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupSettings;
