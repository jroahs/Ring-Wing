import React, { useState } from 'react';
import { toast } from 'react-toastify';

const TimeLogging = ({ staffId, onTimeLogUpdate, colors }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleTimeLog = async (type) => {
    if (!staffId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/time-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          type, // 'in' or 'out'
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to record time');
      
      const newLog = await response.json();
      onTimeLogUpdate(newLog);
      toast.success(`Time ${type} recorded successfully`);
    } catch (error) {
      console.error('Time logging error:', error);
      toast.error(`Failed to record time ${type}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg p-4" style={{ backgroundColor: colors.primary }}>
      <h3 className="text-lg font-semibold mb-4" style={{ color: colors.background }}>
        Time Clock
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleTimeLog('in')}
          disabled={isLoading}
          className="py-2 px-4 rounded font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: colors.accent, color: colors.background }}
        >
          Time In
        </button>
        <button
          onClick={() => handleTimeLog('out')}
          disabled={isLoading}
          className="py-2 px-4 rounded font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: colors.secondary, color: colors.background }}
        >
          Time Out
        </button>
      </div>
    </div>
  );
};

export default TimeLogging;