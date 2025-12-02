import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Moon, 
  Plus, 
  Trash2, 
  Lock, 
  MoreVertical,
  Sun,
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
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);

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
        <DraggableShift schedule={schedule} />
      ) : (
        <div 
          onClick={onClick}
          className={`
            h-full min-h-[3.5rem] flex items-center justify-center
            transition-colors cursor-pointer
            ${isStaffRestDay ? 'bg-amber-900/20' : ''}
            hover:bg-gray-700/30
          `}
        >
          {isStaffRestDay ? (
            <div className="flex items-center gap-1 text-amber-500/60 text-xs">
              <Moon className="w-3 h-3" />
              <span>Rest</span>
            </div>
          ) : (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus className="w-4 h-4 text-gray-500" />
            </div>
          )}
        </div>
      )}

      {/* Holiday indicator */}
      {isHoliday && !schedule && (
        <div className="absolute top-0 right-0 p-0.5">
          <Flag className="w-3 h-3 text-red-400" />
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
              className="absolute top-0 right-0 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden"
            >
              {!schedule?.isLocked && (
                <>
                  <button
                    onClick={() => {
                      onSetRestDay?.();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Moon className="w-4 h-4" />
                    Set as Rest Day
                  </button>
                  {schedule && (
                    <button
                      onClick={() => {
                        onDelete?.();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-400/10 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </>
              )}
              {schedule?.isLocked && (
                <div className="px-3 py-2 text-sm text-amber-400 flex items-center gap-2">
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
