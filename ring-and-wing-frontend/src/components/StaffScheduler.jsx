import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Users,
  Clock,
  BarChart3,
  Settings,
  ChevronRight
} from 'lucide-react';
import { 
  ScheduleCalendar, 
  ScheduleComparisonView,
  ScheduleNotificationBell 
} from './scheduling';

const tabs = [
  { id: 'calendar', label: 'Schedule Calendar', icon: Calendar },
  { id: 'comparison', label: 'Attendance Comparison', icon: BarChart3 }
];

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
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Staff Scheduler</h1>
            <p className="text-sm text-gray-400">Manage employee schedules and track attendance</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Schedule Notifications */}
          <ScheduleNotificationBell />
          
          {/* Tab navigation */}
          <div className="flex bg-gray-700 rounded-lg p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-600'}
                  `}
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
              <ScheduleCalendar />
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
                    className="mb-4 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to staff list
                  </button>
                  <ScheduleComparisonView 
                    staffId={selectedStaffId} 
                    staffName={selectedStaffName}
                  />
                </div>
              ) : (
                <StaffSelectionList onSelect={handleStaffSelect} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Staff selection component for comparison view
const StaffSelectionList = ({ onSelect }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchStaff = async () => {
      try {
        const api = (await import('../utils/api')).default;
        const response = await api.get('/staff');
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-xl font-semibold text-white mb-6">Select Staff Member</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((member) => (
          <motion.button
            key={member._id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(member._id, member.name)}
            className="p-4 bg-gray-800 border border-gray-700 rounded-xl text-left hover:border-blue-500 transition-colors group"
          >
            <div className="flex items-center gap-3">
              {member.profilePicture ? (
                <img
                  src={member.profilePicture}
                  alt={member.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center text-white text-lg">
                  {member.name?.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate group-hover:text-blue-400">
                  {member.name}
                </div>
                <div className="text-sm text-gray-400">{member.position}</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default StaffScheduler;
