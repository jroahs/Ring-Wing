import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Moon,
  Flag,
  User
} from 'lucide-react';
import api from '../../utils/api';

const ScheduleComparisonView = ({ staffId, staffName }) => {
  const [comparison, setComparison] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: getFirstDayOfMonth(),
    endDate: getLastDayOfMonth()
  });

  function getFirstDayOfMonth() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  }

  function getLastDayOfMonth() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  // Fetch comparison data
  useEffect(() => {
    const fetchComparison = async () => {
      if (!staffId) return;

      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/schedules/compare/${staffId}`, {
          params: dateRange
        });

        if (response.data.success) {
          setComparison(response.data.data.comparison);
          setSummary(response.data.data.summary);
        }
      } catch (err) {
        console.error('Error fetching comparison:', err);
        setError('Failed to load attendance comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [staffId, dateRange]);

  // Calculate attendance rate
  const attendanceRate = useMemo(() => {
    if (!summary || summary.totalScheduledDays === 0) return 0;
    return Math.round((summary.workedDays / summary.totalScheduledDays) * 100);
  }, [summary]);

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format minutes to hours
  const formatMinutesToHours = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'worked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
            <CheckCircle className="w-3 h-3" />
            Present
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
            <XCircle className="w-3 h-3" />
            Absent
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            Partial
          </span>
        );
      case 'rest':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">
            <Moon className="w-3 h-3" />
            Rest
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
            <Calendar className="w-3 h-3" />
            Scheduled
          </span>
        );
      default:
        return null;
    }
  };

  // Navigate date range
  const goToPreviousMonth = () => {
    const start = new Date(dateRange.startDate);
    start.setMonth(start.getMonth() - 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    });
  };

  const goToNextMonth = () => {
    const start = new Date(dateRange.startDate);
    start.setMonth(start.getMonth() + 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    setDateRange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Attendance Comparison</h3>
              {staffName && (
                <p className="text-sm text-gray-400 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {staffName}
                </p>
              )}
            </div>
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-white font-medium px-3">
              {new Date(dateRange.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="text-2xl font-bold text-white">{attendanceRate}%</div>
              <div className="text-xs text-gray-400">Attendance Rate</div>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{summary.workedDays}</div>
              <div className="text-xs text-gray-400">Days Worked</div>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="text-2xl font-bold text-red-400">{summary.absentDays}</div>
              <div className="text-xs text-gray-400">Days Absent</div>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="text-2xl font-bold text-amber-400">
                {formatMinutesToHours(summary.totalLateMinutes)}
              </div>
              <div className="text-xs text-gray-400">Total Late</div>
            </div>
            <div className="bg-gray-800 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">
                {formatMinutesToHours(summary.totalOvertimeMinutes)}
              </div>
              <div className="text-xs text-gray-400">Total Overtime</div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Scheduled</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actual</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {comparison.map((day, index) => {
              const date = new Date(day.date);
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <motion.tr
                  key={day.date}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`
                    hover:bg-gray-700/30
                    ${isToday ? 'bg-blue-500/5' : ''}
                    ${day.schedule.isHoliday ? 'bg-red-900/10' : ''}
                  `}
                >
                  {/* Date */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`text-sm font-medium ${isToday ? 'text-blue-400' : 'text-white'}`}>
                        {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      {day.schedule.isHoliday && (
                        <Flag className="w-3 h-3 text-red-400" title={day.schedule.holidayName} />
                      )}
                    </div>
                    {day.schedule.isHoliday && (
                      <div className="text-xs text-red-400">{day.schedule.holidayName}</div>
                    )}
                  </td>

                  {/* Scheduled */}
                  <td className="px-4 py-3">
                    {day.schedule.isRestDay ? (
                      <span className="text-gray-500 text-sm">Rest Day</span>
                    ) : (
                      <div>
                        <div className="text-sm text-white">{day.schedule.shiftName}</div>
                        <div className="text-xs text-gray-400">
                          {day.schedule.startTime} - {day.schedule.endTime}
                          <span className="ml-2 text-gray-500">
                            ({day.schedule.expectedHours}h)
                          </span>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Actual */}
                  <td className="px-4 py-3">
                    {day.actual.clockIn ? (
                      <div>
                        <div className="text-sm text-white">
                          {formatTime(day.actual.clockIn)} - {formatTime(day.actual.clockOut)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {day.actual.hoursWorked?.toFixed(1)}h worked
                          {day.actual.clockMethod && (
                            <span className="ml-2 text-gray-500">
                              via {day.actual.clockMethod}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 text-sm">-</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    {getStatusBadge(day.variance.status)}
                  </td>

                  {/* Variance */}
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {day.variance.lateMinutes > 0 && (
                        <div className="flex items-center gap-1 text-xs text-amber-400">
                          <TrendingDown className="w-3 h-3" />
                          Late: {formatMinutesToHours(day.variance.lateMinutes)}
                        </div>
                      )}
                      {day.variance.overtimeMinutes > 0 && (
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <TrendingUp className="w-3 h-3" />
                          OT: {formatMinutesToHours(day.variance.overtimeMinutes)}
                        </div>
                      )}
                      {day.variance.undertimeMinutes > 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-400">
                          <TrendingDown className="w-3 h-3" />
                          Under: {formatMinutesToHours(day.variance.undertimeMinutes)}
                        </div>
                      )}
                      {day.variance.lateMinutes === 0 && 
                       day.variance.overtimeMinutes === 0 && 
                       day.variance.undertimeMinutes === 0 &&
                       day.variance.status !== 'rest' &&
                       day.variance.status !== 'scheduled' && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Minus className="w-3 h-3" />
                          On time
                        </div>
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {comparison.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No schedule data for this period</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleComparisonView;
