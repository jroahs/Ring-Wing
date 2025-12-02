import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from '@dnd-kit/core';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  Copy,
  Lock,
  Unlock,
  Sun,
  Moon,
  Coffee,
  Send,
  AlertCircle,
  Loader2,
  Filter
} from 'lucide-react';
import api from '../../utils/api';
import ShiftTemplateManager from './ShiftTemplateManager';
import ScheduleCell from './ScheduleCell';
import DraggableShift from './DraggableShift';
import DroppableDay from './DroppableDay';

const ScheduleCalendar = () => {
  // Date state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);

  // Data state
  const [schedules, setSchedules] = useState([]);
  const [staff, setStaff] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // UI state
  const [activeId, setActiveId] = useState(null);
  const [selectedCells, setSelectedCells] = useState([]);
  const [filterPosition, setFilterPosition] = useState('all');
  const [showWeekends, setShowWeekends] = useState(true);

  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Generate days in month
  const daysInMonth = useMemo(() => {
    const days = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month - 1, d);
      days.push({
        date,
        dayOfWeek: date.getDay(),
        dayNumber: d,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        dateString: date.toISOString().split('T')[0]
      });
    }
    return days;
  }, [year, month]);

  // Filter days based on weekend visibility
  const visibleDays = useMemo(() => {
    if (showWeekends) return daysInMonth;
    return daysInMonth.filter(d => !d.isWeekend);
  }, [daysInMonth, showWeekends]);

  // Filter staff by position
  const filteredStaff = useMemo(() => {
    if (filterPosition === 'all') return staff;
    return staff.filter(s => s.position === filterPosition);
  }, [staff, filterPosition]);

  // Unique positions for filter
  const positions = useMemo(() => {
    return [...new Set(staff.map(s => s.position))].filter(Boolean);
  }, [staff]);

  // Fetch schedule data
  const fetchScheduleData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/schedules/month/${year}/${month}`);
      
      if (response.data.success) {
        setSchedules(response.data.data.schedules);
        setStaff(response.data.data.staff);
        setHolidays(response.data.data.holidays);
      }
    } catch (err) {
      console.error('Error fetching schedule:', err);
      setError('Failed to load schedule data');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  // Get schedule for a specific staff and date
  const getSchedule = useCallback((staffId, dateString) => {
    return schedules.find(s => 
      s.staffId?._id === staffId && 
      new Date(s.date).toISOString().split('T')[0] === dateString
    );
  }, [schedules]);

  // Get holiday for a specific date
  const getHoliday = useCallback((dateString) => {
    return holidays.find(h => 
      new Date(h.date).toISOString().split('T')[0] === dateString
    );
  }, [holidays]);

  // Check if a day is a rest day for staff
  const isRestDay = useCallback((staffMember, dayOfWeek) => {
    return staffMember.restDays?.includes(dayOfWeek);
  }, []);

  // Handle cell click (for manual assignment)
  const handleCellClick = async (staffId, dateString, dayOfWeek) => {
    if (!selectedTemplate) return;

    // Check if it's a rest day
    const staffMember = staff.find(s => s._id === staffId);
    if (isRestDay(staffMember, dayOfWeek)) {
      if (!confirm('This is a rest day for this employee. Assign shift anyway?')) {
        return;
      }
    }

    try {
      setSaving(true);
      const existing = getSchedule(staffId, dateString);

      if (existing) {
        // Update existing
        const response = await api.put(`/schedules/${existing._id}`, {
          shiftTemplateId: selectedTemplate._id,
          isRestDay: false
        });
        if (response.data.success) {
          setSchedules(schedules.map(s => 
            s._id === existing._id ? response.data.data : s
          ));
        }
      } else {
        // Create new
        const response = await api.post('/schedules', {
          staffId,
          date: dateString,
          shiftTemplateId: selectedTemplate._id
        });
        if (response.data.success) {
          setSchedules([...schedules, response.data.data]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign schedule');
    } finally {
      setSaving(false);
    }
  };

  // Handle marking as rest day
  const handleSetRestDay = async (staffId, dateString) => {
    try {
      setSaving(true);
      const existing = getSchedule(staffId, dateString);

      if (existing) {
        const response = await api.put(`/schedules/${existing._id}`, {
          isRestDay: true,
          shiftTemplateId: null
        });
        if (response.data.success) {
          setSchedules(schedules.map(s => 
            s._id === existing._id ? response.data.data : s
          ));
        }
      } else {
        const response = await api.post('/schedules', {
          staffId,
          date: dateString,
          isRestDay: true
        });
        if (response.data.success) {
          setSchedules([...schedules, response.data.data]);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set rest day');
    } finally {
      setSaving(false);
    }
  };

  // Handle deleting a schedule
  const handleDeleteSchedule = async (scheduleId) => {
    try {
      setSaving(true);
      await api.delete(`/schedules/${scheduleId}`);
      setSchedules(schedules.filter(s => s._id !== scheduleId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete schedule');
    } finally {
      setSaving(false);
    }
  };

  // Handle apply template to staff for the month
  const handleApplyTemplate = async (staffId) => {
    if (!selectedTemplate) {
      alert('Please select a shift template first');
      return;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    try {
      setSaving(true);
      const response = await api.post('/schedules/apply-template', {
        staffId,
        shiftTemplateId: selectedTemplate._id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        skipRestDays: true,
        skipHolidays: true,
        overwriteExisting: false
      });

      if (response.data.success) {
        fetchScheduleData(); // Refresh data
        alert(`Applied template: ${response.data.message}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply template');
    } finally {
      setSaving(false);
    }
  };

  // Handle publish schedules
  const handlePublishSchedules = async () => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const staffIds = filteredStaff.map(s => s._id);

    try {
      setSaving(true);
      const response = await api.post('/schedule-notifications/publish', {
        staffIds,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      if (response.data.success) {
        alert(`Schedule published! ${response.data.data.notified} staff notified.`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish schedule');
    } finally {
      setSaving(false);
    }
  };

  // Navigate months
  const goToPrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
  };

  // Day name headers
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Handle drag start
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  // Handle drag end
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Parse the drop target
    const [targetStaffId, targetDate] = over.id.split('_');
    const sourceSchedule = schedules.find(s => s._id === active.id);

    if (!sourceSchedule) return;
    if (sourceSchedule.isLocked) {
      setError('Cannot move locked schedule');
      return;
    }

    // If dropping on same cell, do nothing
    const sourceDate = new Date(sourceSchedule.date).toISOString().split('T')[0];
    if (sourceSchedule.staffId._id === targetStaffId && sourceDate === targetDate) {
      return;
    }

    try {
      setSaving(true);
      
      // Delete old schedule
      await api.delete(`/schedules/${sourceSchedule._id}`);
      
      // Create new at target location
      const response = await api.post('/schedules', {
        staffId: targetStaffId,
        date: targetDate,
        shiftTemplateId: sourceSchedule.shiftTemplateId?._id,
        customStartTime: sourceSchedule.customStartTime,
        customEndTime: sourceSchedule.customEndTime
      });

      if (response.data.success) {
        setSchedules([
          ...schedules.filter(s => s._id !== sourceSchedule._id),
          response.data.data
        ]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to move schedule');
      fetchScheduleData(); // Refresh to restore state
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <Calendar className="w-6 h-6 text-blue-400" />
          <h1 className="text-xl font-semibold text-white">Staff Scheduling</h1>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-white font-medium bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            {monthNames[month - 1]} {year}
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showWeekends}
              onChange={(e) => setShowWeekends(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-blue-500"
            />
            Weekends
          </label>

          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
          >
            <option value="all">All Positions</option>
            {positions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>

          <button
            onClick={handlePublishSchedules}
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Publish
          </button>
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500/10 border-b border-red-500/30 px-4 py-2 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Shift templates */}
        <div className="w-72 border-r border-gray-700 p-4 overflow-y-auto">
          <ShiftTemplateManager
            onTemplateSelect={setSelectedTemplate}
            selectedTemplateId={selectedTemplate?._id}
          />

          {selectedTemplate && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400">
                <strong>Selected:</strong> {selectedTemplate.name}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Click on any cell to assign this shift, or drag to move existing shifts.
              </p>
            </div>
          )}
        </div>

        {/* Calendar grid */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-auto">
            <div className="min-w-max">
              {/* Day headers */}
              <div className="sticky top-0 z-10 flex bg-gray-800 border-b border-gray-700">
                <div className="w-48 min-w-[12rem] p-3 border-r border-gray-700 flex items-center">
                  <Users className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-300">Staff</span>
                </div>
                {visibleDays.map((day) => {
                  const holiday = getHoliday(day.dateString);
                  const isToday = day.dateString === new Date().toISOString().split('T')[0];
                  
                  return (
                    <div
                      key={day.dateString}
                      className={`
                        w-28 min-w-[7rem] p-2 border-r border-gray-700 text-center
                        ${day.isWeekend ? 'bg-gray-800/50' : ''}
                        ${holiday ? 'bg-red-900/20' : ''}
                        ${isToday ? 'bg-blue-900/20' : ''}
                      `}
                    >
                      <div className={`text-xs ${day.isWeekend ? 'text-amber-400' : 'text-gray-400'}`}>
                        {dayNames[day.dayOfWeek]}
                      </div>
                      <div className={`text-lg font-medium ${isToday ? 'text-blue-400' : 'text-white'}`}>
                        {day.dayNumber}
                      </div>
                      {holiday && (
                        <div className="text-[10px] text-red-400 truncate" title={holiday.name}>
                          {holiday.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Staff rows */}
              {filteredStaff.map((staffMember) => (
                <div key={staffMember._id} className="flex border-b border-gray-700/50 hover:bg-gray-800/30">
                  {/* Staff info */}
                  <div className="w-48 min-w-[12rem] p-2 border-r border-gray-700 flex items-center gap-2">
                    {staffMember.profilePicture ? (
                      <img
                        src={staffMember.profilePicture}
                        alt={staffMember.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm">
                        {staffMember.name?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {staffMember.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {staffMember.position}
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyTemplate(staffMember._id)}
                      disabled={!selectedTemplate || saving}
                      className="p-1 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors disabled:opacity-50"
                      title="Apply template to all workdays"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day cells */}
                  {visibleDays.map((day) => {
                    const schedule = getSchedule(staffMember._id, day.dateString);
                    const isStaffRestDay = isRestDay(staffMember, day.dayOfWeek);
                    const holiday = getHoliday(day.dateString);

                    return (
                      <DroppableDay
                        key={`${staffMember._id}_${day.dateString}`}
                        id={`${staffMember._id}_${day.dateString}`}
                        staffId={staffMember._id}
                        date={day.dateString}
                        isWeekend={day.isWeekend}
                        isHoliday={!!holiday}
                        isRestDay={isStaffRestDay}
                      >
                        <ScheduleCell
                          schedule={schedule}
                          isWeekend={day.isWeekend}
                          isHoliday={!!holiday}
                          holidayName={holiday?.name}
                          isStaffRestDay={isStaffRestDay}
                          onClick={() => handleCellClick(staffMember._id, day.dateString, day.dayOfWeek)}
                          onSetRestDay={() => handleSetRestDay(staffMember._id, day.dateString)}
                          onDelete={() => schedule && handleDeleteSchedule(schedule._id)}
                        />
                      </DroppableDay>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeId && (
              <DraggableShift
                schedule={schedules.find(s => s._id === activeId)}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Saving indicator */}
      <AnimatePresence>
        {saving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleCalendar;
