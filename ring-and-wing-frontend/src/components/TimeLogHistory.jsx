import React from 'react';

const TimeLogHistory = ({ timeLogs, colors }) => {
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const calculateDuration = (timeIn, timeOut) => {
    if (!timeIn || !timeOut) return '-';
    const diff = new Date(timeOut) - new Date(timeIn);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Group logs by date
  const groupedLogs = timeLogs.reduce((acc, log) => {
    const date = new Date(log.timestamp).toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {});

  // Create pairs of clock-in/clock-out logs
  const createPairs = (logs) => {
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    const pairs = [];
    let currentClockIn = null;
    
    for (const log of sortedLogs) {
      if (log.type === 'clockIn') {
        currentClockIn = log;
      } else if (log.type === 'clockOut' && currentClockIn) {
        pairs.push({
          clockIn: currentClockIn,
          clockOut: log,
          duration: calculateDuration(currentClockIn.timestamp, log.timestamp)
        });
        currentClockIn = null;
      }
    }
    
    return pairs;
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedLogs).map(([date, logs]) => {
        const pairs = createPairs(logs);
        
        return (
          <div key={date} className="border rounded-lg overflow-hidden" style={{ borderColor: colors.muted }}>
            <div className="p-3" style={{ backgroundColor: colors.accent + '10' }}>
              <h3 className="font-medium" style={{ color: colors.primary }}>{date}</h3>
            </div>
            <div className="p-3">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-sm py-1" style={{ color: colors.muted }}>Time In</th>
                    <th className="text-left text-sm py-1" style={{ color: colors.muted }}>Time Out</th>
                    <th className="text-left text-sm py-1" style={{ color: colors.muted }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.length > 0 ? (
                    pairs.map((pair, idx) => (
                      <tr key={idx} className="text-sm">
                        <td className="py-1" style={{ color: colors.primary }}>
                          {formatDateTime(pair.clockIn.timestamp)}
                        </td>
                        <td className="py-1" style={{ color: colors.primary }}>
                          {formatDateTime(pair.clockOut.timestamp)}
                        </td>
                        <td className="py-1" style={{ color: colors.secondary }}>
                          {pair.duration}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="text-center py-2" style={{ color: colors.muted }}>
                        No complete clock-in/out pairs found for this day
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {timeLogs.length === 0 && (
        <div className="text-center py-6" style={{ color: colors.muted }}>
          No time logs found for this period
        </div>
      )}
    </div>
  );
};

export default TimeLogHistory;