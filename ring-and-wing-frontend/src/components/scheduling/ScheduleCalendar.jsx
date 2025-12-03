import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  Send,
  AlertCircle,
  Loader2,
  LayoutGrid,
  List,
  UserPlus
} from 'lucide-react';
import api from '../../services/api';
import ShiftTemplateManager from './ShiftTemplateManager';
import ScheduleCell from './ScheduleCell';
import DraggableShift from './DraggableShift';
import DroppableDay from './DroppableDay';

// Helper to format date as local YYYY-MM-DD (avoids timezone issues)
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Theme colors matching the app
const theme = {
  primary: '#2e0304',
  accent: '#f1670f',
  accentHover: '#d55a0d',
  muted: '#ac9c9b',
  background: '#fefdfd',
  cardBg: '#fff',
  border: '#e5e0df',
  textPrimary: '#2e0304',
  textSecondary: '#6b5c5b',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444'
};

const ScheduleCalendar = () => {
  const navigate = useNavigate();
  
  // Date state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [weekOffset, setWeekOffset] = useState(0);

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
  const [activeDragType, setActiveDragType] = useState(null); // 'schedule' or 'template'
  const [draggedTemplate, setDraggedTemplate] = useState(null);
  const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
  const [filterPosition, setFilterPosition] = useState('all');
  const [templates, setTemplates] = useState([]); // Store templates for drag overlay
  const [schedulingSettings, setSchedulingSettings] = useState({
    defaultRestDays: [0], // Default to Sunday
    gracePeriodMinutes: 15
  });

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
    const lastDay = new Date(year, month, 0);
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(year, month - 1, d);
      days.push({
        date,
        dayOfWeek: date.getDay(),
        dayNumber: d,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        dateString: formatLocalDate(date)
      });
    }
    return days;
  }, [year, month]);

  // Get current week's days
  const currentWeekDays = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push({
        date,
        dayOfWeek: date.getDay(),
        dayNumber: date.getDate(),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        dateString: formatLocalDate(date),
        isToday: date.toDateString() === today.toDateString(),
        month: date.getMonth() + 1,
        year: date.getFullYear()
      });
    }
    return days;
  }, [weekOffset]);

  // Visible days based on view mode
  const visibleDays = useMemo(() => {
    return viewMode === 'week' ? currentWeekDays : daysInMonth;
  }, [viewMode, currentWeekDays, daysInMonth]);

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
      
      if (viewMode === 'week') {
        // Week view might span two months, fetch both if needed
        const startMonth = currentWeekDays[0]?.month;
        const endMonth = currentWeekDays[6]?.month;
        const startYear = currentWeekDays[0]?.year;
        const endYear = currentWeekDays[6]?.year;
        
        console.log('[ScheduleCalendar] Week view fetching:', { startYear, startMonth, endYear, endMonth });
        
        const responses = await Promise.all([
          api.get(`/api/schedules/month/${startYear}/${startMonth}`),
          // Only fetch second month if different
          startMonth !== endMonth || startYear !== endYear
            ? api.get(`/api/schedules/month/${endYear}/${endMonth}`)
            : null
        ].filter(Boolean));
        
        console.log('[ScheduleCalendar] Raw responses:', responses.map(r => r.data));
        
        // Merge schedules from both months
        let allSchedules = [];
        let allHolidays = [];
        let staffList = [];
        
        responses.forEach((response, idx) => {
          const data = response.data?.data || response.data;
          console.log('[ScheduleCalendar] Processing response', idx, ':', {
            success: response.data?.success,
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : [],
            staffCount: data?.staff?.length,
            schedulesCount: data?.schedules?.length
          });
          
          if (data && (data.schedules || data.staff)) {
            allSchedules = [...allSchedules, ...(data.schedules || [])];
            allHolidays = [...allHolidays, ...(data.holidays || [])];
            if (idx === 0) {
              staffList = data.staff || [];
            }
          }
        });
        
        // Dedupe schedules by ID
        const uniqueSchedules = allSchedules.filter((s, i, arr) => 
          arr.findIndex(x => x._id === s._id) === i
        );
        
        console.log('[ScheduleCalendar] Combined response:', { 
          schedules: uniqueSchedules.length, 
          staff: staffList.length 
        });
        
        setSchedules(uniqueSchedules);
        setStaff(staffList);
        setHolidays(allHolidays);
      } else {
        // Month view - single fetch
        console.log('[ScheduleCalendar] Fetching schedule for:', year, month);
        const response = await api.get(`/api/schedules/month/${year}/${month}`);
        console.log('[ScheduleCalendar] Response:', response.data);
        
        const data = response.data?.data || response.data;
        if (data && (data.schedules || data.staff)) {
          const staffList = data.staff || [];
          console.log('[ScheduleCalendar] Staff count:', staffList.length);
          setSchedules(data.schedules || []);
          setStaff(staffList);
          setHolidays(data.holidays || []);
        }
      }
    } catch (err) {
      console.error('[ScheduleCalendar] Error fetching schedule:', err);
      setError('Failed to load schedule data. Make sure the backend is running.');
      setSchedules([]);
      setStaff([]);
      setHolidays([]);
    } finally {
      setLoading(false);
    }
  }, [year, month, viewMode, currentWeekDays]);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  // Fetch scheduling settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/api/settings/scheduling');
        const data = response.data?.data || response.data;
        if (data) {
          setSchedulingSettings({
            defaultRestDays: data.defaultRestDays || [0],
            gracePeriodMinutes: data.gracePeriodMinutes || 15
          });
          console.log('[ScheduleCalendar] Loaded scheduling settings:', data);
        }
      } catch (err) {
        console.error('[ScheduleCalendar] Error fetching scheduling settings:', err);
        // Use defaults if fetch fails
      }
    };
    fetchSettings();
  }, []);

  // Get schedule for a specific staff and date
  const getSchedule = useCallback((staffId, dateString) => {
    return schedules.find(s => 
      s.staffId?._id === staffId && 
      formatLocalDate(new Date(s.date)) === dateString
    );
  }, [schedules]);

  // Get holiday for a specific date
  const getHoliday = useCallback((dateString) => {
    return holidays.find(h => 
      formatLocalDate(new Date(h.date)) === dateString
    );
  }, [holidays]);

  // Check if a day is a rest day for staff (uses settings default or staff-specific)
  const isRestDay = useCallback((staffMember, dayOfWeek) => {
    // Staff-specific rest days take precedence
    if (staffMember?.restDays && staffMember.restDays.length > 0) {
      return staffMember.restDays.includes(dayOfWeek);
    }
    // Fall back to default rest days from settings
    return schedulingSettings.defaultRestDays.includes(dayOfWeek);
  }, [schedulingSettings.defaultRestDays]);

  // Handle cell click
  const handleCellClick = async (staffId, dateString, dayOfWeek) => {
    if (!selectedTemplate) return;

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
        const response = await api.put(`/api/schedules/${existing._id}`, {
          shiftTemplateId: selectedTemplate._id,
          isRestDay: false
        });
        const updatedSchedule = response.data?.data || response.data;
        console.log('[ScheduleCalendar] Updated schedule:', updatedSchedule);
        if (updatedSchedule?._id) {
          setSchedules(prev => prev.map(s => 
            s._id === existing._id ? updatedSchedule : s
          ));
        }
      } else {
        const response = await api.post('/api/schedules', {
          staffId,
          date: dateString,
          shiftTemplateId: selectedTemplate._id
        });
        const newSchedule = response.data?.data || response.data;
        console.log('[ScheduleCalendar] New schedule created:', newSchedule);
        if (newSchedule?._id) {
          setSchedules(prev => [...prev, newSchedule]);
        }
      }
    } catch (err) {
      console.error('[ScheduleCalendar] Error assigning schedule:', err);
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
        const response = await api.put(`/api/schedules/${existing._id}`, {
          isRestDay: true,
          shiftTemplateId: null
        });
        const updatedSchedule = response.data?.data || response.data;
        if (updatedSchedule?._id) {
          setSchedules(prev => prev.map(s => 
            s._id === existing._id ? updatedSchedule : s
          ));
        }
      } else {
        const response = await api.post('/api/schedules', {
          staffId,
          date: dateString,
          isRestDay: true
        });
        const newSchedule = response.data?.data || response.data;
        if (newSchedule?._id) {
          setSchedules(prev => [...prev, newSchedule]);
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
      await api.delete(`/api/schedules/${scheduleId}`);
      setSchedules(prev => prev.filter(s => s._id !== scheduleId));
      console.log('[ScheduleCalendar] Deleted schedule:', scheduleId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete schedule');
    } finally {
      setSaving(false);
    }
  };

  // Handle apply template
  const handleApplyTemplate = async (staffId) => {
    if (!selectedTemplate) {
      alert('Please select a shift template first');
      return;
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    try {
      setSaving(true);
      const response = await api.post('/api/schedules/apply-template', {
        staffId,
        shiftTemplateId: selectedTemplate._id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        skipRestDays: true,
        skipHolidays: true,
        overwriteExisting: false
      });

      const result = response.data?.data || response.data;
      fetchScheduleData();
      alert(result?.message || 'Template applied successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to apply template');
    } finally {
      setSaving(false);
    }
  };

  // Handle publish
  const handlePublishSchedules = async () => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const staffIds = filteredStaff.map(s => s._id);

    try {
      setSaving(true);
      const response = await api.post('/api/schedule-notifications/publish', {
        staffIds,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const result = response.data?.data || response.data;
      alert(`Schedule published! ${result?.notified || 0} staff notified.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish schedule');
    } finally {
      setSaving(false);
    }
  };

  // Navigation
  const goToPrevious = () => {
    if (viewMode === 'week') {
      setWeekOffset(prev => prev - 1);
    } else {
      if (month === 1) {
        setMonth(12);
        setYear(year - 1);
      } else {
        setMonth(month - 1);
      }
    }
  };

  const goToNext = () => {
    if (viewMode === 'week') {
      setWeekOffset(prev => prev + 1);
    } else {
      if (month === 12) {
        setMonth(1);
        setYear(year + 1);
      } else {
        setMonth(month + 1);
      }
    }
  };

  const goToToday = () => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setWeekOffset(0);
  };

  // Drag handlers
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    
    // Check if dragging a template (starts with 'template_')
    if (String(active.id).startsWith('template_')) {
      setActiveDragType('template');
      const templateId = String(active.id).replace('template_', '');
      const template = templates.find(t => t._id === templateId);
      setDraggedTemplate(template);
      console.log('[ScheduleCalendar] Dragging template:', template?.name);
    } else {
      setActiveDragType('schedule');
      setDraggedTemplate(null);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    const dragType = activeDragType;
    
    // Reset drag state
    setActiveId(null);
    setActiveDragType(null);
    setDraggedTemplate(null);

    if (!over) return;

    // Handle template drop
    if (dragType === 'template') {
      const templateId = String(active.id).replace('template_', '');
      const template = templates.find(t => t._id === templateId);
      if (!template) return;
      
      const [targetStaffId, targetDate] = over.id.split('_');
      if (!targetStaffId || !targetDate) return;
      
      console.log('[ScheduleCalendar] Dropping template', template.name, 'on', targetStaffId, targetDate);
      
      try {
        setSaving(true);
        const existing = getSchedule(targetStaffId, targetDate);
        
        if (existing) {
          // Update existing schedule
          const response = await api.put(`/api/schedules/${existing._id}`, {
            shiftTemplateId: template._id,
            isRestDay: false
          });
          const updatedSchedule = response.data?.data || response.data;
          if (updatedSchedule?._id) {
            setSchedules(prev => prev.map(s => 
              s._id === existing._id ? updatedSchedule : s
            ));
          }
        } else {
          // Create new schedule
          const response = await api.post('/api/schedules', {
            staffId: targetStaffId,
            date: targetDate,
            shiftTemplateId: template._id
          });
          const newSchedule = response.data?.data || response.data;
          if (newSchedule?._id) {
            setSchedules(prev => [...prev, newSchedule]);
          }
        }
      } catch (err) {
        console.error('[ScheduleCalendar] Error dropping template:', err);
        setError(err.response?.data?.message || 'Failed to assign schedule');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Handle schedule move (existing logic)
    const [targetStaffId, targetDate] = over.id.split('_');
    const sourceSchedule = schedules.find(s => s._id === active.id);

    if (!sourceSchedule) return;
    if (sourceSchedule.isLocked) {
      setError('Cannot move locked schedule');
      return;
    }

    const sourceDate = formatLocalDate(new Date(sourceSchedule.date));
    if (sourceSchedule.staffId._id === targetStaffId && sourceDate === targetDate) {
      return;
    }

    try {
      setSaving(true);
      console.log('[ScheduleCalendar] Drag: Moving schedule from', sourceSchedule._id, 'to', targetStaffId, targetDate);
      
      // First remove from UI optimistically
      setSchedules(prev => prev.filter(s => s._id !== sourceSchedule._id));
      
      await api.delete(`/api/schedules/${sourceSchedule._id}`);
      
      const response = await api.post('/api/schedules', {
        staffId: targetStaffId,
        date: targetDate,
        shiftTemplateId: sourceSchedule.shiftTemplateId?._id,
        customStartTime: sourceSchedule.customStartTime,
        customEndTime: sourceSchedule.customEndTime
      });

      const newSchedule = response.data?.data || response.data;
      console.log('[ScheduleCalendar] Drag: New schedule created:', newSchedule);
      
      if (newSchedule?._id) {
        setSchedules(prev => [...prev, newSchedule]);
      } else {
        // Refetch if we couldn't parse the response
        fetchScheduleData();
      }
    } catch (err) {
      console.error('[ScheduleCalendar] Drag error:', err);
      setError(err.response?.data?.message || 'Failed to move schedule');
      fetchScheduleData();
    } finally {
      setSaving(false);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getNavigationTitle = () => {
    if (viewMode === 'week') {
      const firstDay = currentWeekDays[0];
      const lastDay = currentWeekDays[6];
      if (firstDay.month === lastDay.month) {
        return `${monthNames[firstDay.month - 1]} ${firstDay.dayNumber} - ${lastDay.dayNumber}, ${firstDay.year}`;
      }
      return `${monthNames[firstDay.month - 1]} ${firstDay.dayNumber} - ${monthNames[lastDay.month - 1]} ${lastDay.dayNumber}`;
    }
    return `${monthNames[month - 1]} ${year}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" style={{ backgroundColor: theme.background }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.accent }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: theme.background }}>
      {/* Header */}
      <div 
        className="flex flex-wrap items-center justify-between gap-4 p-4 border-b"
        style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
      >
        <div className="flex items-center gap-4">
          <Calendar className="w-6 h-6" style={{ color: theme.accent }} />
          <h1 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>
            Staff Scheduling
          </h1>
        </div>

        {/* View mode toggle */}
        <div 
          className="flex rounded-lg p-1"
          style={{ backgroundColor: theme.background }}
        >
          <button
            onClick={() => setViewMode('week')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{ 
              backgroundColor: viewMode === 'week' ? theme.accent : 'transparent',
              color: viewMode === 'week' ? 'white' : theme.textSecondary
            }}
          >
            <List className="w-4 h-4" />
            Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{ 
              backgroundColor: viewMode === 'month' ? theme.accent : 'transparent',
              color: viewMode === 'month' ? 'white' : theme.textSecondary
            }}
          >
            <LayoutGrid className="w-4 h-4" />
            Month
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: theme.textSecondary }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 rounded-lg font-medium transition-colors hover:bg-gray-100"
            style={{ color: theme.textPrimary }}
          >
            {getNavigationTitle()}
          </button>
          <button
            onClick={goToNext}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: theme.textSecondary }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <select
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border"
            style={{ 
              backgroundColor: theme.cardBg, 
              borderColor: theme.border,
              color: theme.textPrimary 
            }}
          >
            <option value="all">All Positions</option>
            {positions.map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>

          <button
            onClick={handlePublishSchedules}
            disabled={saving}
            className="px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-white"
            style={{ backgroundColor: theme.accent }}
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
            className="px-4 py-2 flex items-center gap-2 border-b"
            style={{ backgroundColor: `${theme.danger}10`, borderColor: `${theme.danger}30` }}
          >
            <AlertCircle className="w-4 h-4" style={{ color: theme.danger }} />
            <span className="text-sm" style={{ color: theme.danger }}>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto"
              style={{ color: theme.danger }}
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content - wrapped in DndContext for drag-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div 
            className="w-64 border-r p-4 overflow-y-auto flex-shrink-0"
            style={{ borderColor: theme.border, backgroundColor: theme.cardBg }}
          >
            <ShiftTemplateManager
              onTemplateSelect={setSelectedTemplate}
              selectedTemplateId={selectedTemplate?._id}
              colors={theme}
              onTemplatesLoaded={setTemplates}
            />

            {selectedTemplate && (
              <div 
                className="mt-4 p-3 rounded-lg border"
                style={{ 
                  backgroundColor: `${theme.accent}10`, 
                  borderColor: `${theme.accent}30` 
                }}
              >
                <p className="text-sm" style={{ color: theme.accent }}>
                  <strong>Selected:</strong> {selectedTemplate.name}
                </p>
                <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
                  Click on any cell or drag templates to assign shifts.
                </p>
              </div>
            )}
          </div>

          {/* Calendar grid */}
          <div className="flex-1 overflow-auto">
            <div className={viewMode === 'month' ? 'min-w-max' : ''}>
              {/* Day headers */}
              <div 
                className="sticky top-0 z-10 flex border-b"
                style={{ backgroundColor: theme.cardBg, borderColor: theme.border }}
              >
                <div 
                  className="w-48 min-w-[12rem] p-3 border-r flex items-center flex-shrink-0"
                  style={{ borderColor: theme.border }}
                >
                  <Users className="w-4 h-4 mr-2" style={{ color: theme.textSecondary }} />
                  <span className="text-sm font-medium" style={{ color: theme.textSecondary }}>
                    Staff ({filteredStaff.length})
                  </span>
                </div>
                {visibleDays.map((day) => {
                  const holiday = getHoliday(day.dateString);
                  const isToday = day.dateString === formatLocalDate(new Date());
                  
                  return (
                    <div
                      key={day.dateString}
                      className={`p-2 border-r text-center flex-shrink-0 ${
                        viewMode === 'week' ? 'flex-1 min-w-[100px]' : 'w-24 min-w-[6rem]'
                      }`}
                      style={{ 
                        borderColor: theme.border,
                        backgroundColor: holiday ? `${theme.danger}08` : isToday ? `${theme.accent}08` : 'transparent'
                      }}
                    >
                      <div 
                        className="text-xs font-medium"
                        style={{ color: day.isWeekend ? theme.warning : theme.textSecondary }}
                      >
                        {dayNames[day.dayOfWeek]}
                      </div>
                      <div 
                        className="text-lg font-semibold"
                        style={{ color: isToday ? theme.accent : theme.textPrimary }}
                      >
                        {day.dayNumber}
                      </div>
                      {holiday && (
                        <div 
                          className="text-[10px] truncate" 
                          title={holiday.name}
                          style={{ color: theme.danger }}
                        >
                          {holiday.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Staff rows */}
              {filteredStaff.length === 0 ? (
                <div 
                  className="p-12 text-center"
                  style={{ color: theme.textSecondary }}
                >
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-40" />
                  <p className="text-lg font-medium mb-2" style={{ color: theme.textPrimary }}>
                    No staff members found
                  </p>
                  <p className="text-sm mb-6">
                    Add staff in Employee Management first to create schedules.
                  </p>
                  <button
                    onClick={() => navigate('/employees')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
                    style={{ backgroundColor: theme.accent }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = theme.accentHover}
                    onMouseLeave={(e) => e.target.style.backgroundColor = theme.accent}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Staff Members
                  </button>
                </div>
              ) : (
                filteredStaff.map((staffMember) => (
                  <div 
                    key={staffMember._id} 
                    className="flex border-b hover:bg-gray-50"
                    style={{ borderColor: theme.border }}
                  >
                    {/* Staff info */}
                    <div 
                      className="w-48 min-w-[12rem] p-2 border-r flex items-center gap-2 flex-shrink-0"
                      style={{ borderColor: theme.border, backgroundColor: theme.cardBg }}
                    >
                      {staffMember.profilePicture ? (
                        <img
                          src={staffMember.profilePicture}
                          alt={staffMember.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                          style={{ backgroundColor: theme.accent }}
                        >
                          {staffMember.name?.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div 
                          className="text-sm font-medium truncate"
                          style={{ color: theme.textPrimary }}
                        >
                          {staffMember.name}
                        </div>
                        <div 
                          className="text-xs truncate"
                          style={{ color: theme.textSecondary }}
                        >
                          {staffMember.position}
                        </div>
                      </div>
                      <button
                        onClick={() => handleApplyTemplate(staffMember._id)}
                        disabled={!selectedTemplate || saving}
                        className="p-1 rounded transition-colors hover:bg-gray-100 disabled:opacity-50"
                        style={{ color: theme.textSecondary }}
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
                          theme={theme}
                          viewMode={viewMode}
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
                            theme={theme}
                          />
                        </DroppableDay>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeId && activeDragType === 'schedule' && (
              <DraggableShift
                schedule={schedules.find(s => s._id === activeId)}
                isDragging
                theme={theme}
              />
            )}
            {activeId && activeDragType === 'template' && draggedTemplate && (
              <div 
                className="px-3 py-2 rounded-lg shadow-lg text-white text-sm font-medium"
                style={{ backgroundColor: draggedTemplate.color || theme.accent }}
              >
                {draggedTemplate.name}
              </div>
            )}
          </DragOverlay>
        </div>
      </DndContext>

      {/* Saving indicator */}
      <AnimatePresence>
        {saving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-white"
            style={{ backgroundColor: theme.accent }}
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
