import React, { useState, useEffect } from 'react';
import { FiClock, FiLogIn, FiLogOut, FiCalendar } from 'react-icons/fi';

const TimeClockInterface = () => {
  const [activeLog, setActiveLog] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userData, setUserData] = useState(null);

  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };

  const API_BASE_URL = 'http://localhost:5000';

  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    if (storedUserData) {
      setUserData(JSON.parse(storedUserData));
    }
  }, []);

  useEffect(() => {
    const cleanup = { current: false };
    
    if (userData?.id) {
      checkActiveTimeLog();
      fetchRecentLogs();
      
      // Set up periodic check for active log
      const interval = setInterval(() => {
        if (!cleanup.current) {
          checkActiveTimeLog();
        }
      }, 60000); // Check every minute
      
      return () => {
        cleanup.current = true;
        clearInterval(interval);
      };
    }
  }, [userData]);

  const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const handleAuthError = (error) => {
    if (error.message.includes('Authentication token') || error.message.includes('401')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.reload();
    }
    setError(error.message || 'An error occurred');
  };

  const checkActiveTimeLog = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const response = await fetch(`${API_BASE_URL}/api/time-logs/staff/${userData.id}?startDate=${todayStart.toISOString()}`, {
        headers: getAuthHeader()
      });

      if (!response.ok) {
        throw new Error(response.status === 401 ? 'Authentication failed' : 'Failed to fetch time log');
      }

      const { data } = await response.json();
      if (!data) throw new Error('No data received');
      
      const active = data.find(log => !log.clockOut);
      setActiveLog(active || null);
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const response = await fetch(
        `${API_BASE_URL}/api/time-logs/staff/${userData.id}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        { headers: getAuthHeader() }
      );

      if (!response.ok) {
        throw new Error(response.status === 401 ? 'Authentication failed' : 'Failed to fetch recent logs');
      }

      const { data } = await response.json();
      if (!data) throw new Error('No data received');
      
      setRecentLogs(data);
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleClockIn = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/time-logs/clock-in`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ staffId: userData.id })
      });

      if (!response.ok) {
        throw new Error(response.status === 401 ? 'Authentication failed' : 'Failed to clock in');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to clock in');
      }
      
      setActiveLog(result.data);
      await fetchRecentLogs();
      setError('');
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/time-logs/clock-out`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ staffId: userData.id })
      });

      if (!response.ok) {
        throw new Error(response.status === 401 ? 'Authentication failed' : 'Failed to clock out');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to clock out');
      }
      
      setActiveLog(null);
      await fetchRecentLogs();
      setError('');
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateDuration = (clockIn, clockOut) => {
    if (!clockOut) return 'Active';
    const diff = new Date(clockOut) - new Date(clockIn);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.background }}>
        <p className="text-lg" style={{ color: colors.primary }}>Please log in to access the time clock.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.background }}>
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clock In/Out Card */}
          <div className="p-6 rounded-lg shadow-sm" style={{ border: `1px solid ${colors.muted}` }}>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: colors.primary }}>
              <FiClock />
              Time Clock
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {activeLog ? (
                <>
                  <div className="p-4 rounded" style={{ backgroundColor: `${colors.accent}15` }}>
                    <p className="text-sm mb-2" style={{ color: colors.secondary }}>Clocked in at:</p>
                    <p className="text-lg font-semibold" style={{ color: colors.accent }}>
                      {formatTime(activeLog.clockIn)}
                    </p>
                  </div>
                  <button
                    onClick={handleClockOut}
                    disabled={isLoading}
                    className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: colors.secondary, color: colors.background }}
                  >
                    <FiLogOut />
                    Clock Out
                  </button>
                </>
              ) : (
                <button
                  onClick={handleClockIn}
                  disabled={isLoading}
                  className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: colors.accent, color: colors.background }}
                >
                  <FiLogIn />
                  Clock In
                </button>
              )}
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="p-6 rounded-lg shadow-sm" style={{ border: `1px solid ${colors.muted}` }}>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2" style={{ color: colors.primary }}>
              <FiCalendar />
              Recent Activity
            </h2>

            <div className="space-y-4">
              {recentLogs.map(log => (
                <div
                  key={log._id}
                  className="p-4 rounded"
                  style={{ backgroundColor: colors.background, border: `1px solid ${colors.muted}` }}
                >
                  <p className="text-sm mb-2" style={{ color: colors.muted }}>
                    {formatDate(log.date)}
                  </p>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm">In: {formatTime(log.clockIn)}</p>
                      {log.clockOut && (
                        <p className="text-sm">Out: {formatTime(log.clockOut)}</p>
                      )}
                    </div>
                    <div
                      className="text-sm font-medium px-3 py-1 rounded"
                      style={{
                        backgroundColor: log.isOvertime ? `${colors.accent}15` : `${colors.secondary}15`,
                        color: log.isOvertime ? colors.accent : colors.secondary
                      }}
                    >
                      {calculateDuration(log.clockIn, log.clockOut)}
                      {log.isOvertime && ' (OT)'}
                    </div>
                  </div>
                </div>
              ))}

              {recentLogs.length === 0 && (
                <p className="text-center py-4" style={{ color: colors.muted }}>
                  No recent activity
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeClockInterface;