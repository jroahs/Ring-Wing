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
import api from '../../services/api';
import { businessDateKey } from '../../utils/businessDate';

// Helper to format date as local YYYY-MM-DD (avoids timezone issues)
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ScheduleComparisonView = ({ staffId, staffName, colors = {} }) => {
  const [comparison, setComparison] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Theme
  const defaultColors = {
    text: '#1a1a1a',
    muted: '#6b7280',
    border: '#e5e0df',
    background: '#f9fafb',
    primary: '#f1670f',
    accent: '#f1670f',
    danger: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981'
  };
  const c = { ...defaultColors, ...colors };

  // Compute date range from currentMonth
  const dateRange = useMemo(() => {
    const firstDay = new Date(currentMonth.year, currentMonth.month, 1);
    const lastDay = new Date(currentMonth.year, currentMonth.month + 1, 0);
    return {
      startDate: formatLocalDate(firstDay),
      endDate: formatLocalDate(lastDay)
    };
  }, [currentMonth]);

  // Fetch comparison data
  useEffect(() => {
    // Skip if no staffId
    if (!staffId) return;

    const fetchComparison = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('[ScheduleComparisonView] Fetching comparison for:', staffId, dateRange);
        const response = await api.get(`/api/schedules/compare/${staffId}`, {
          params: dateRange
        });

        console.log('[ScheduleComparisonView] Response:', response.data);
        
        // Handle both wrapped and unwrapped response formats
        const data = response.data?.data || response.data;
        console.log('[ScheduleComparisonView] Parsed data:', {
          comparisonCount: data?.comparison?.length,
          summary: data?.summary
        });
        
        if (data) {
          setComparison(data.comparison || []);
          setSummary(data.summary || null);
        }
      } catch (err) {
        console.error('Error fetching comparison:', err);
        setError('Failed to load attendance comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [staffId, dateRange.startDate, dateRange.endDate]); // Re-fetch when staffId or month changes

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
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: `${c.success}15`, color: c.success }}
          >
            <CheckCircle className="w-3 h-3" />
            Present
          </span>
        );
      case 'absent':
        return (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: `${c.danger}15`, color: c.danger }}
          >
            <XCircle className="w-3 h-3" />
            Absent
          </span>
        );
      case 'late-no-clockin':
        return (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs animate-pulse"
            style={{ backgroundColor: `${c.danger}20`, color: c.danger }}
          >
            <AlertTriangle className="w-3 h-3" />
            Late (No Clock-in)
          </span>
        );
      case 'pending-clockin':
        return (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: `${c.warning}15`, color: c.warning }}
          >
            <Clock className="w-3 h-3" />
            Awaiting Clock-in
          </span>
        );
      case 'partial':
        return (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: `${c.warning}15`, color: c.warning }}
          >
            <AlertTriangle className="w-3 h-3" />
            Partial
          </span>
        );
      case 'rest':
        return (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: `${c.muted}15`, color: c.muted }}
          >
            <Moon className="w-3 h-3" />
            Rest
          </span>
        );
      case 'scheduled':
        return (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: `${c.primary}15`, color: c.primary }}
          >
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
    setCurrentMonth(prev => {
      const newMonth = prev.month - 1;
      if (newMonth < 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: newMonth };
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = prev.month + 1;
      if (newMonth > 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: newMonth };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: c.primary }} />
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#fff', border: `1px solid ${c.border}` }}>
      {/* Header */}
      <div className="p-4" style={{ backgroundColor: `${c.muted}05`, borderBottom: `1px solid ${c.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${c.primary}15` }}>
              <Clock className="w-5 h-5" style={{ color: c.primary }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold" style={{ color: c.text }}>Attendance Comparison</h3>
              {staffName && (
                <p className="text-sm flex items-center gap-1" style={{ color: c.muted }}>
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
              className="p-2 rounded-lg transition-colors"
              style={{ color: c.muted }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = c.text;
                e.currentTarget.style.backgroundColor = `${c.muted}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = c.muted;
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-medium px-3" style={{ color: c.text }}>
              {new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg transition-colors"
              style={{ color: c.muted }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = c.text;
                e.currentTarget.style.backgroundColor = `${c.muted}10`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = c.muted;
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Summary stats */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#fff', border: `1px solid ${c.border}` }}>
              <div className="text-2xl font-bold" style={{ color: c.text }}>{attendanceRate}%</div>
              <div className="text-xs" style={{ color: c.muted }}>Attendance Rate</div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#fff', border: `1px solid ${c.border}` }}>
              <div className="text-2xl font-bold" style={{ color: c.success }}>{summary.workedDays}</div>
              <div className="text-xs" style={{ color: c.muted }}>Days Worked</div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#fff', border: `1px solid ${c.border}` }}>
              <div className="text-2xl font-bold" style={{ color: c.danger }}>{summary.absentDays}</div>
              <div className="text-xs" style={{ color: c.muted }}>Days Absent</div>
            </div>
            {(summary.lateNoClockin > 0 || summary.pendingClockin > 0) && (
              <div className="p-3 rounded-lg" style={{ backgroundColor: `${c.danger}10`, border: `1px solid ${c.danger}30` }}>
                <div className="text-2xl font-bold" style={{ color: c.danger }}>{summary.lateNoClockin}</div>
                <div className="text-xs" style={{ color: c.danger }}>Late (No Clock-in)</div>
              </div>
            )}
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#fff', border: `1px solid ${c.border}` }}>
              <div className="text-2xl font-bold" style={{ color: c.warning }}>
                {formatMinutesToHours(summary.totalLateMinutes)}
              </div>
              <div className="text-xs" style={{ color: c.muted }}>Total Late</div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#fff', border: `1px solid ${c.border}` }}>
              <div className="text-2xl font-bold" style={{ color: c.primary }}>
                {formatMinutesToHours(summary.totalOvertimeMinutes)}
              </div>
              <div className="text-xs" style={{ color: c.muted }}>Total Overtime</div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div 
          className="m-4 p-3 rounded-lg text-sm"
          style={{ backgroundColor: `${c.danger}10`, border: `1px solid ${c.danger}30`, color: c.danger }}
        >
          {error}
        </div>
      )}

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: `${c.muted}05` }}>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: c.muted }}>Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: c.muted }}>Scheduled</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: c.muted }}>Actual</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: c.muted }}>Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: c.muted }}>Variance</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((day, index) => {
              const date = new Date(day.date);
              const isToday = businessDateKey(date) === businessDateKey(new Date());
              
              return (
                <motion.tr
                  key={day.date}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  style={{ 
                    borderBottom: `1px solid ${c.border}40`,
                    backgroundColor: isToday ? `${c.primary}05` : day.schedule.isHoliday ? `${c.danger}05` : 'transparent'
                  }}
                >
                  {/* Date */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium" style={{ color: isToday ? c.primary : c.text }}>
                        {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      {day.schedule.isHoliday && (
                        <Flag className="w-3 h-3" style={{ color: c.danger }} title={day.schedule.holidayName} />
                      )}
                    </div>
                    {day.schedule.isHoliday && (
                      <div className="text-xs" style={{ color: c.danger }}>{day.schedule.holidayName}</div>
                    )}
                  </td>

                  {/* Scheduled */}
                  <td className="px-4 py-3">
                    {day.schedule.isRestDay ? (
                      <span className="text-sm" style={{ color: c.muted }}>Rest Day</span>
                    ) : (
                      <div>
                        <div className="text-sm" style={{ color: c.text }}>{day.schedule.shiftName}</div>
                        <div className="text-xs" style={{ color: c.muted }}>
                          {day.schedule.startTime} - {day.schedule.endTime}
                          <span className="ml-2" style={{ color: `${c.muted}80` }}>
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
                        <div className="text-sm" style={{ color: c.text }}>
                          {formatTime(day.actual.clockIn)} - {formatTime(day.actual.clockOut)}
                        </div>
                        <div className="text-xs" style={{ color: c.muted }}>
                          {day.actual.hoursWorked?.toFixed(1)}h worked
                          {day.actual.clockMethod && (
                            <span className="ml-2" style={{ color: `${c.muted}80` }}>
                              via {day.actual.clockMethod}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: c.muted }}>-</span>
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
                        <div className="flex items-center gap-1 text-xs" style={{ color: c.warning }}>
                          <TrendingDown className="w-3 h-3" />
                          Late: {formatMinutesToHours(day.variance.lateMinutes)}
                        </div>
                      )}
                      {day.variance.overtimeMinutes > 0 && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: c.success }}>
                          <TrendingUp className="w-3 h-3" />
                          OT: {formatMinutesToHours(day.variance.overtimeMinutes)}
                        </div>
                      )}
                      {day.variance.undertimeMinutes > 0 && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: c.danger }}>
                          <TrendingDown className="w-3 h-3" />
                          Under: {formatMinutesToHours(day.variance.undertimeMinutes)}
                        </div>
                      )}
                      {day.variance.lateMinutes === 0 && 
                       day.variance.overtimeMinutes === 0 && 
                       day.variance.undertimeMinutes === 0 &&
                       day.variance.status !== 'rest' &&
                       day.variance.status !== 'scheduled' && (
                        <div className="flex items-center gap-1 text-xs" style={{ color: c.muted }}>
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
          <div className="text-center py-12" style={{ color: c.muted }}>
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No schedule data for this period</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleComparisonView;
