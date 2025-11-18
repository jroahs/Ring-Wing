import React, { useState, useEffect } from 'react';
import { FiClock, FiX, FiCheckCircle, FiAlertCircle, FiActivity } from 'react-icons/fi';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from './services/apiService';

const TimeClockInterface = ({ staffId, onClose }) => {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastLog, setLastLog] = useState(null);
  const [currentTime, setCurrentTime] = useState('');

  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };

  // Update current time every minute
  useEffect(() => {
    updateCurrentTime();
    const intervalId = setInterval(updateCurrentTime, 60000);
    return () => clearInterval(intervalId);
  }, []);
  
  const updateCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    setCurrentTime(`${hours}:${minutes} ${ampm}`);
  };

  // Fetch staff data
  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        // Use the proper endpoint based on whether we have a staffId or userId
        const endpoint = staffId.includes('user') 
          ? `/api/staff/${staffId}`  // If it already includes 'user' in the path
          : `/api/staff/user/${staffId}`; // Otherwise, use the user endpoint

        console.log('Fetching staff data from:', endpoint);
        
        // Add authorization token to the request
        const token = localStorage.getItem('authToken');
        const config = {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        };

        const response = await api.get(endpoint, config);
        const staffData = response.data.data || response.data;
        setStaff(staffData);
        await fetchLastTimeLog(staffData._id);
        setError(null);
      } catch (err) {
        console.error('Staff fetching error:', err);
        setError(err.response?.data?.message || 'Failed to fetch staff data');
      } finally {
        setLoading(false);
      }
    };

    if (staffId) {
      fetchStaffData();
    }
  }, [staffId]);

  const fetchLastTimeLog = async (staffId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const params = new URLSearchParams({ 
        startDate: today.toISOString(),
        endDate: new Date().toISOString()
      }).toString();

      // Add authorization token to the request
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };

      const { data } = await api.get(`/api/time-logs/staff/${staffId}?${params}`, config);
      
      if (data?.data?.length > 0) {
        const formattedTimestamp = formatDateTime(data.data[0].timestamp || data.data[0].createdAt);
        setLastLog({
          ...data.data[0],
          formattedTimestamp
        });
      } else {
        setLastLog(null);
      }
    } catch (error) {
      console.error('Error fetching time logs:', error);
    }
  };

  const handleTimeLog = async (type) => {
    if (!staff?._id) {
      toast.error('Staff data not available');
      return;
    }
    
    setLoading(true);
    try {
      // Add authorization token to the request
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };
      
      const { data } = await api.post(`/api/time-logs/${type === 'in' ? 'clock-in' : 'clock-out'}`, {
        userId: staff.userId
      }, config);
      
      if (!data.success) {
        throw new Error(`Failed to clock ${type}`);
      }

      const formattedTime = formatDateTime(data.data.timestamp || data.data.createdAt);
      setLastLog({
        ...data.data,
        formattedTimestamp: formattedTime
      });
      
      await fetchLastTimeLog(staff._id);
      toast.success(`Clock ${type} recorded successfully`);
      updateCurrentTime();
    } catch (error) {
      console.error('Time logging error:', error);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date string received:', dateString);
        return new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Date formatting error:', error, 'for date string:', dateString);
      return 'Invalid Date';
    }
  };

  const isActiveSession = lastLog && lastLog.type === 'clockIn';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md m-4"
        style={{ border: `1px solid ${colors.muted}` }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>
              <FiClock className="inline-block mr-2" />
              Time Clock
            </h2>
            <button 
              onClick={onClose}
              className="p-1 hover:opacity-70"
              style={{ color: colors.muted }}
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="text-center py-6">
              <div className="animate-pulse text-lg" style={{ color: colors.muted }}>
                Processing...
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="text-center py-4">
              <FiAlertCircle size={40} className="mx-auto mb-2 text-red-500" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded"
                style={{ backgroundColor: colors.primary, color: colors.background }}
              >
                Close
              </button>
            </div>
          )}

          {/* Staff info & time log */}
          {!loading && !error && staff && (
            <>
              <div className="mb-6">
                <p className="text-lg font-medium" style={{ color: colors.primary }}>
                  {staff.name}
                </p>
                <p className="text-sm" style={{ color: colors.muted }}>
                  {staff.position}
                </p>
              </div>

              <div className="space-y-4">
                {/* Current Time Display */}
                <div 
                  className="p-4 rounded text-center"
                  style={{ backgroundColor: colors.primary + '10' }}
                >
                  <p className="text-sm font-medium mb-1" style={{ color: colors.muted }}>
                    Current Time
                  </p>
                  <p className="text-2xl font-bold" style={{ color: colors.primary }}>
                    {currentTime}
                  </p>
                </div>
                
                {/* Status */}
                <div 
                  className="p-4 rounded flex flex-col items-center justify-center gap-2"
                  style={{ 
                    backgroundColor: isActiveSession ? 
                      colors.accent + '20' : colors.secondary + '10' 
                  }}
                >
                  <div className="flex items-center justify-center gap-2">
                    {isActiveSession ? (
                      <>
                        <FiCheckCircle size={20} style={{ color: colors.accent }} />
                        <p className="text-sm font-medium" style={{ color: colors.accent }}>
                          You are currently clocked in
                        </p>
                      </>
                    ) : (
                      <>
                        <FiClock size={20} style={{ color: colors.secondary }} />
                        <p className="text-sm font-medium" style={{ color: colors.secondary }}>
                          {lastLog ? 'You are clocked out' : 'Not clocked in today'}
                        </p>
                      </>
                    )}
                  </div>
                  
                  {/* Display clock-in time if active session */}
                  {isActiveSession && lastLog && (
                    <div className="w-full text-center mt-2 pt-2 border-t" style={{ borderColor: colors.accent + '50' }}>
                      <p className="text-xs" style={{ color: colors.muted }}>
                        Clocked in at:
                      </p>
                      <p className="text-sm font-medium" style={{ color: colors.accent }}>
                        {lastLog.formattedTimestamp || formatDateTime(lastLog.timestamp || lastLog.createdAt)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleTimeLog('in')}
                    disabled={loading || isActiveSession}
                    className="py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: colors.accent, color: colors.background }}
                  >
                    Clock In
                  </button>
                  <button
                    onClick={() => handleTimeLog('out')}
                    disabled={loading || !isActiveSession}
                    className="py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: colors.secondary, color: colors.background }}
                  >
                    Clock Out
                  </button>
                </div>
                
                {/* Recent Activity */}
                <div className="mt-4 pt-4 border-t" style={{ borderColor: colors.muted }}>
                  <h3 className="text-sm font-medium mb-2 flex items-center gap-1" style={{ color: colors.primary }}>
                    <FiActivity size={14} />
                    Recent Activity
                  </h3>
                  
                  {lastLog ? (
                    <div className="p-3 rounded text-sm" style={{ backgroundColor: colors.muted + '15' }}>
                      <div className="flex justify-between">
                        <span style={{ color: colors.secondary }}>
                          {lastLog.type === 'clockIn' ? 'Clock In' : 'Clock Out'}
                        </span>
                        <span style={{ color: colors.muted }}>
                          {lastLog.formattedTimestamp || formatDateTime(lastLog.timestamp || lastLog.createdAt)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-center" style={{ color: colors.muted }}>
                      No recent activity
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeClockInterface;