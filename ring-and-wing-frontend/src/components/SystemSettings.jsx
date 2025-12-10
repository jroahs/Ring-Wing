import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSettings, FiCreditCard, FiClock, FiChevronRight, FiDollarSign, FiCalendar, FiDatabase } from 'react-icons/fi';
import PaymentSettings from './PaymentSettings';
import AttendanceSettings from './AttendanceSettings';
import SchedulingSettings from './SchedulingSettings';
import PayrollSettings from './PayrollSettings';
import BackupSettings from './BackupSettings';
import { theme } from '../theme';

const SystemSettings = () => {
  const [activeSection, setActiveSection] = useState('payment'); // 'payment', 'attendance', 'scheduling', 'payroll'

  const settingsSections = [
    {
      id: 'payment',
      name: 'Payment Settings',
      description: 'Configure payment methods and verification',
      icon: FiCreditCard,
      component: PaymentSettings
    },
    {
      id: 'attendance',
      name: 'Attendance Settings',
      description: 'Configure time clock modes and options',
      icon: FiClock,
      component: AttendanceSettings
    },
    {
      id: 'scheduling',
      name: 'Scheduling Settings',
      description: 'Grace period, overtime rules, and more',
      icon: FiCalendar,
      component: SchedulingSettings
    },
    {
      id: 'payroll',
      name: 'Payroll Settings',
      description: 'DOLE-compliant multipliers and deductions',
      icon: FiDollarSign,
      component: PayrollSettings
    },
    {
      id: 'backups',
      name: 'Backups',
      description: 'Database and storage backups',
      icon: FiDatabase,
      component: BackupSettings
    }
  ];

  const ActiveComponent = settingsSections.find(s => s.id === activeSection)?.component;

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>
      <div className="flex flex-col lg:flex-row">
        {/* Settings Navigation Sidebar */}
        <div className="lg:w-72 p-4 lg:p-6 lg:border-r" style={{ borderColor: theme.colors.muted + '30' }}>
          <div className="flex items-center gap-2 mb-6 pb-4 border-b" style={{ borderColor: theme.colors.muted + '30' }}>
            <FiSettings className="text-xl" style={{ color: theme.colors.accent }} />
            <h2 className="text-lg font-bold" style={{ color: theme.colors.primary }}>
              System Settings
            </h2>
          </div>

          <nav className="space-y-2">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              
              return (
                <motion.button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                    isActive ? 'shadow-sm' : 'hover:bg-gray-50'
                  }`}
                  style={{
                    backgroundColor: isActive ? theme.colors.accent + '15' : 'transparent',
                    borderLeft: isActive ? `3px solid ${theme.colors.accent}` : '3px solid transparent'
                  }}
                  whileHover={{ x: isActive ? 0 : 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div 
                    className={`p-2 rounded-lg ${isActive ? '' : ''}`}
                    style={{ 
                      backgroundColor: isActive ? theme.colors.accent : theme.colors.muted + '20',
                      color: isActive ? 'white' : theme.colors.secondary
                    }}
                  >
                    <Icon className="text-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p 
                      className="font-medium text-sm truncate"
                      style={{ color: isActive ? theme.colors.accent : theme.colors.primary }}
                    >
                      {section.name}
                    </p>
                    <p 
                      className="text-xs truncate mt-0.5"
                      style={{ color: theme.colors.muted }}
                    >
                      {section.description}
                    </p>
                  </div>
                  <FiChevronRight 
                    className={`transition-transform ${isActive ? 'rotate-90' : ''}`}
                    style={{ color: isActive ? theme.colors.accent : theme.colors.muted }}
                  />
                </motion.button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 lg:max-h-screen lg:overflow-y-auto">
          <AnimatePresence mode="wait">
            {ActiveComponent && (
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <ActiveComponent />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
