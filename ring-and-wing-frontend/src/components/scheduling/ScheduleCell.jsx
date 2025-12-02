import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, 
  Plus, 
  Trash2, 
  Lock, 
  Flag
} from 'lucide-react';
import DraggableShift from './DraggableShift';

const ScheduleCell = ({
  schedule,
  isWeekend,
  isHoliday,
  holidayName,
  isStaffRestDay,
  onClick,
  onSetRestDay,
  onDelete,
  theme = {},
  viewMode = 'week'
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const defaultTheme = {
    text: '#1a1a1a',
    muted: '#6b7280',
    border: '#e5e0df',
    background: '#f9fafb',
    primary: '#f1670f',
    accent: '#f1670f',
    danger: '#ef4444',
    warning: '#f59e0b'
  };

  const t = { ...defaultTheme, ...theme };

  const handleContextMenu = (e) => {
    e.preventDefault();
    setShowMenu(true);
  };

  return (
    <div
      className="h-full relative group"
      onContextMenu={handleContextMenu}
    >
      {schedule ? (
        <DraggableShift schedule={schedule} theme={theme} viewMode={viewMode} />
      ) : (
        <div 
          onClick={onClick}
          className="h-full min-h-[3.5rem] flex items-center justify-center transition-colors cursor-pointer"
          style={{
            backgroundColor: isStaffRestDay ? `${t.warning}10` : 'transparent'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isStaffRestDay ? `${t.warning}20` : `${t.muted}10`}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isStaffRestDay ? `${t.warning}10` : 'transparent'}
        >
          {isStaffRestDay ? (
            <div className="flex items-center gap-1 text-xs" style={{ color: `${t.warning}99` }}>
              <Moon className="w-3 h-3" />
              <span>Rest</span>
            </div>
          ) : (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus className="w-4 h-4" style={{ color: t.muted }} />
            </div>
          )}
        </div>
      )}

      {/* Holiday indicator */}
      {isHoliday && !schedule && (
        <div className="absolute top-0 right-0 p-0.5">
          <Flag className="w-3 h-3" style={{ color: t.danger }} />
        </div>
      )}

      {/* Context menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-0 right-0 z-50 rounded-lg shadow-xl overflow-hidden"
              style={{
                backgroundColor: '#fff',
                border: `1px solid ${t.border}`
              }}
            >
              {!schedule?.isLocked && (
                <>
                  <button
                    onClick={() => {
                      onSetRestDay?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50"
                    style={{ color: t.text }}
                  >
                    <Moon className="w-4 h-4" style={{ color: t.warning }} />
                    Set as Rest Day
                  </button>
                  {schedule && (
                    <button
                      onClick={() => {
                        onDelete?.();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2"
                      style={{ color: t.danger }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${t.danger}10`}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </>
              )}
              {schedule?.isLocked && (
                <div className="px-3 py-2 text-sm flex items-center gap-2" style={{ color: t.warning }}>
                  <Lock className="w-4 h-4" />
                  Locked (Payroll Generated)
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScheduleCell;
