import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Flag,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import api from '../../utils/api';

const StaffScheduleView = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [restDays, setRestDays] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generate month dates
  const monthDates = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const dates = [];
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month, d);
      dates.push({
        date,
        dateString: date.toISOString().split('T')[0],
        dayOfWeek: date.getDay(),
        dayNumber: d,
        isToday: date.toDateString() === new Date().toDateString(),
        isPast: date < new Date().setHours(0, 0, 0, 0),
        isFuture: date > new Date()
      });
    }
    return dates;
  }, [currentMonth]);

  // Fetch schedule data
  useEffect(() => {
    const fetchMySchedule = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const response = await api.get('/schedules/my-schedule', {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        });

        if (response.data.success) {
          setSchedules(response.data.data.schedules);
          setHolidays(response.data.data.holidays || []);
          setRestDays(response.data.data.restDays || []);
        }
      } catch (err) {
        console.error('Error fetching schedule:', err);
        setError('Failed to load your schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchMySchedule();
  }, [currentMonth]);

  // Get schedule for a date
  const getScheduleForDate = (dateString) => {
    return schedules.find(s => 
      new Date(s.date).toISOString().split('T')[0] === dateString
    );
  };

  // Get holiday for a date
  const getHolidayForDate = (dateString) => {
    return holidays.find(h =>
      new Date(h.date).toISOString().split('T')[0] === dateString
    );
  };

  // Check if day is a default rest day
  const isDefaultRestDay = (dayOfWeek) => {
    return restDays.includes(dayOfWeek);
  };

  // Format time
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Navigation
  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group dates by week
  const weeks = useMemo(() => {
    const result = [];
    let currentWeek = [];
    
    // Add empty days at start
    const firstDayOfWeek = monthDates[0]?.dayOfWeek || 0;
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    monthDates.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    // Add empty days at end
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      result.push(currentWeek);
    }

    return result;
  }, [monthDates]);

  // Summary stats
  const stats = useMemo(() => {
    const workDays = schedules.filter(s => !s.isRestDay);
    const restDaysCount = schedules.filter(s => s.isRestDay).length;
    const totalHours = workDays.reduce((sum, s) => sum + (s.expectedHours || 0), 0);

    return {
      workDays: workDays.length,
      restDays: restDaysCount,
      totalHours: totalHours.toFixed(1)
    };
  }, [schedules]);

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
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">My Schedule</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevMonth}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium"
            >
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="bg-gray-800 px-4 py-2 rounded-lg">
            <div className="text-2xl font-bold text-white">{stats.workDays}</div>
            <div className="text-xs text-gray-400">Work Days</div>
          </div>
          <div className="bg-gray-800 px-4 py-2 rounded-lg">
            <div className="text-2xl font-bold text-amber-400">{stats.restDays}</div>
            <div className="text-xs text-gray-400">Rest Days</div>
          </div>
          <div className="bg-gray-800 px-4 py-2 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{stats.totalHours}</div>
            <div className="text-xs text-gray-400">Total Hours</div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="m-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Calendar */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day, index) => (
            <div
              key={day}
              className={`text-center text-sm font-medium py-2 ${
                index === 0 || index === 6 ? 'text-amber-400' : 'text-gray-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((day, dayIndex) => {
                if (!day) {
                  return <div key={dayIndex} className="h-24" />;
                }

                const schedule = getScheduleForDate(day.dateString);
                const holiday = getHolidayForDate(day.dateString);
                const isRest = schedule?.isRestDay || isDefaultRestDay(day.dayOfWeek);
                const shift = schedule?.shiftTemplateId;

                return (
                  <motion.div
                    key={day.dateString}
                    whileHover={{ scale: 1.02 }}
                    className={`
                      h-24 p-2 rounded-lg border transition-colors
                      ${day.isToday 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-gray-700 bg-gray-800/50'}
                      ${day.isPast ? 'opacity-60' : ''}
                      ${holiday ? 'bg-red-900/20 border-red-500/30' : ''}
                    `}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${
                        day.isToday ? 'text-blue-400' : 'text-white'
                      }`}>
                        {day.dayNumber}
                      </span>
                      {holiday && (
                        <Flag className="w-3 h-3 text-red-400" />
                      )}
                    </div>

                    {/* Schedule content */}
                    {schedule ? (
                      <div className="h-full">
                        {schedule.isRestDay ? (
                          <div className="flex items-center gap-1 text-amber-500 text-xs">
                            <Moon className="w-3 h-3" />
                            <span>Rest Day</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div
                              className="text-xs font-medium text-white truncate flex items-center gap-1"
                            >
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: shift?.color || '#6366F1' }}
                              />
                              {shift?.name || 'Shift'}
                            </div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(schedule.customStartTime || shift?.startTime)}
                              {' - '}
                              {formatTime(schedule.customEndTime || shift?.endTime)}
                            </div>
                            {schedule.expectedHours && (
                              <div className="text-[10px] text-gray-500">
                                {schedule.expectedHours}h
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : isRest ? (
                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <Moon className="w-3 h-3" />
                        <span>Rest</span>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic">
                        No schedule
                      </div>
                    )}

                    {/* Holiday name */}
                    {holiday && (
                      <div className="absolute bottom-1 left-1 right-1 text-[9px] text-red-400 truncate">
                        {holiday.name}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1">
            <Moon className="w-3 h-3 text-amber-500" />
            <span>Rest Day</span>
          </div>
          <div className="flex items-center gap-1">
            <Flag className="w-3 h-3 text-red-400" />
            <span>Holiday</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffScheduleView;
