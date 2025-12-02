import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Users,
  BarChart3,
  ChevronRight,
  Clock
} from 'lucide-react';
import { 
  ScheduleCalendar, 
  ScheduleComparisonView,
  ScheduleNotificationBell,
  ShiftTemplateManager
} from './scheduling';

const tabs = [
  { id: 'calendar', label: 'Schedule', icon: Calendar },
  { id: 'templates', label: 'Shift Templates', icon: Clock },
  { id: 'comparison', label: 'Attendance', icon: BarChart3 }
];

// Theme colors matching the app design
const themeColors = {
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

const StaffScheduler = () => {
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [selectedStaffName, setSelectedStaffName] = useState('');

  const handleStaffSelect = (staffId, staffName) => {
    setSelectedStaffId(staffId);
    setSelectedStaffName(staffName);
    setActiveTab('comparison');
  };

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: themeColors.background }}>
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-4"
        style={{ 
          backgroundColor: '#fff', 
          borderBottom: `1px solid ${themeColors.border}` 
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${themeColors.primary}15` }}
          >
            <Users className="w-6 h-6" style={{ color: themeColors.primary }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: themeColors.text }}>
              Staff Scheduler
            </h1>
            <p className="text-sm" style={{ color: themeColors.muted }}>
              Manage employee schedules and track attendance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Schedule Notifications */}
          <ScheduleNotificationBell colors={themeColors} />
          
          {/* Tab navigation */}
          <div 
            className="flex rounded-lg p-1"
            style={{ backgroundColor: `${themeColors.muted}10` }}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? themeColors.primary : 'transparent',
                    color: isActive ? '#fff' : themeColors.muted
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'calendar' && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <ScheduleCalendar colors={themeColors} />
            </motion.div>
          )}

          {activeTab === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full p-6 overflow-auto"
            >
              <ShiftTemplateManager colors={themeColors} />
            </motion.div>
          )}

          {activeTab === 'comparison' && (
            <motion.div
              key="comparison"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full p-6 overflow-auto"
            >
              {selectedStaffId ? (
                <div>
                  <button
                    onClick={() => setSelectedStaffId(null)}
                    className="mb-4 text-sm flex items-center gap-1"
                    style={{ color: themeColors.primary }}
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to staff list
                  </button>
                  <ScheduleComparisonView 
                    staffId={selectedStaffId} 
                    staffName={selectedStaffName}
                    colors={themeColors}
                  />
                </div>
              ) : (
                <StaffSelectionList onSelect={handleStaffSelect} colors={themeColors} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Staff selection component for comparison view
const StaffSelectionList = ({ onSelect, colors = {} }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const c = { ...themeColors, ...colors };

  React.useEffect(() => {
    const fetchStaff = async () => {
      try {
        const api = (await import('../services/api')).default;
        const response = await api.get('/api/staff');
        if (response.data.success) {
          setStaff(response.data.data.filter(s => s.status === 'Active'));
        }
      } catch (err) {
        console.error('Error fetching staff:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div 
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: c.primary }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold mb-6" style={{ color: c.text }}>
        Select Staff Member
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => (
          <motion.button
            key={member._id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(member._id, member.name)}
            className="p-4 rounded-xl text-left transition-colors group"
            style={{ 
              backgroundColor: '#fff', 
              border: `1px solid ${c.border}` 
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = c.primary}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = c.border}
          >
            <div className="flex items-center gap-3">
              {member.profilePicture ? (
                <img
                  src={member.profilePicture}
                  alt={member.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg"
                  style={{ backgroundColor: c.primary }}
                >
                  {member.name?.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate" style={{ color: c.text }}>
                  {member.name}
                </div>
                <div className="text-sm" style={{ color: c.muted }}>{member.position}</div>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: c.muted }} />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default StaffScheduler;
