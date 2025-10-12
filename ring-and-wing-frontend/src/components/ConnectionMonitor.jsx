import React, { useState, useEffect } from 'react';

const ConnectionMonitor = () => {
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [lastCheck, setLastCheck] = useState(null);
  const [connectionLogs, setConnectionLogs] = useState([]);

  const checkConnection = async () => {
    try {
      setConnectionStatus('checking');
      const response = await fetch('/api/menu', {
        method: 'HEAD', // Use HEAD for lightweight check
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setConnectionStatus('connected');
        logEvent('Connection OK', 'success');
      } else {
        setConnectionStatus('error');
        logEvent(`Connection error: ${response.status}`, 'error');
      }
    } catch (error) {
      setConnectionStatus('disconnected');
      logEvent(`Connection failed: ${error.message}`, 'error');
    }
    setLastCheck(new Date());
  };

  const logEvent = (message, type) => {
    const event = {
      message,
      type,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[CONNECTION_MONITOR] ${message}`, event);
    
    setConnectionLogs(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 logs
  };

  useEffect(() => {
    // REDUCED: Check connection every 5 minutes instead of 30 seconds
    // This reduces per-user requests from 120/hour to 12/hour
    // Frontend monitoring is redundant with backend monitoring
    const interval = setInterval(checkConnection, 300000); // Changed from 30000 (30s) to 300000 (5min)
    // Initial check
    checkConnection();
    
    // Listen for online/offline events
    const handleOnline = () => {
      logEvent('Browser detected online', 'info');
      checkConnection();
    };
    
    const handleOffline = () => {
      logEvent('Browser detected offline', 'warning');
      setConnectionStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#22c55e';
      case 'checking': return '#fbbf24';
      case 'disconnected': 
      case 'error': return '#ef4444';
      case 'offline': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'checking': return 'Checking...';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Error';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg border p-3 z-50 max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: getStatusColor() }}
        />
        <span className="text-sm font-medium">{getStatusText()}</span>
        <button 
          onClick={checkConnection}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          Check
        </button>
      </div>
      
      {lastCheck && (
        <div className="text-xs text-gray-500 mb-2">
          Last check: {lastCheck.toLocaleTimeString()}
        </div>
      )}
      
      {connectionLogs.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
            Connection Log
          </summary>
          <div className="mt-2 max-h-40 overflow-y-auto">
            {connectionLogs.map((log, index) => (
              <div 
                key={index}
                className={`py-1 text-xs ${
                  log.type === 'error' ? 'text-red-600' : 
                  log.type === 'success' ? 'text-green-600' : 
                  log.type === 'warning' ? 'text-yellow-600' : 
                  'text-gray-600'
                }`}
              >
                <div>{log.message}</div>
                <div className="text-xs text-gray-400">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export default ConnectionMonitor;