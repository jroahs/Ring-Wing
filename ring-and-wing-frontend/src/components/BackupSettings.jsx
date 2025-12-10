import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiDatabase, FiClock, FiRefreshCw, FiDownload, FiShield } from 'react-icons/fi';
import { API_URL } from '../App';
import { theme } from '../theme';

const formatDate = (value) => value ? new Date(value).toLocaleString() : '—';

const BackupSettings = () => {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(null);
  const [backups, setBackups] = useState([]);
  const [retentionDays, setRetentionDays] = useState(14);

  const token = localStorage.getItem('authToken');

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/api/backups/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load backup status');
      setStatus(json.data);
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

  const runBackup = async () => {
    try {
      setRunning(true);
      const res = await fetch(`${API_URL}/api/backups/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Backup failed');
      toast.success('Backup completed');
      await Promise.all([fetchStatus(), fetchList()]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchList()]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          {status ? (
            <div className="space-y-1 text-sm" style={{ color: theme.colors.primary }}>
              <div>Status: <span style={{ color: status.status === 'success' ? '#16a34a' : '#dc2626' }}>{status.status || 'unknown'}</span></div>
              <div>Started: {formatDate(status.startedAt)}</div>
              <div>Completed: {formatDate(status.completedAt)}</div>
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
        <div className="flex items-center gap-2 mb-3" style={{ color: theme.colors.primary }}>
          <FiDownload />
          <span className="font-semibold">Recent Backups</span>
        </div>
        {loading ? (
          <p className="text-sm" style={{ color: muted }}>Loading backups…</p>
        ) : backups && backups.length ? (
          <div className="overflow-x-auto">
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
    </div>
  );
};

export default BackupSettings;
