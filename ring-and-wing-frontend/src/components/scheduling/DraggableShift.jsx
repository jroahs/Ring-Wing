import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { GripVertical, Lock, Moon, Sun, Coffee } from 'lucide-react';

const DraggableShift = ({ schedule, isDragging = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isDndDragging
  } = useDraggable({
    id: schedule?._id || 'temp',
    disabled: schedule?.isLocked
  });

  if (!schedule) return null;

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const shiftTemplate = schedule.shiftTemplateId;
  const isRestDay = schedule.isRestDay;
  const isLocked = schedule.isLocked;

  // Format time
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    return `${hour % 12 || 12}${hour >= 12 ? 'p' : 'a'}`;
  };

  const startTime = schedule.customStartTime || shiftTemplate?.startTime;
  const endTime = schedule.customEndTime || shiftTemplate?.endTime;

  if (isRestDay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`
          flex items-center justify-center gap-1 p-1 rounded text-xs
          bg-gray-600/30 text-gray-400
          ${isDragging || isDndDragging ? 'opacity-75 shadow-lg' : ''}
        `}
      >
        <Moon className="w-3 h-3" />
        <span>Rest</span>
      </div>
    );
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      className={`
        flex items-center gap-1 p-1.5 rounded text-xs
        ${isDragging || isDndDragging ? 'opacity-90 shadow-xl z-50' : ''}
        ${isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
      `}
    >
      {/* Color indicator */}
      <div
        className="w-1.5 h-full min-h-[20px] rounded-full flex-shrink-0"
        style={{ backgroundColor: shiftTemplate?.color || '#6366F1' }}
      />

      {/* Shift info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">
          {shiftTemplate?.name || 'Custom'}
        </div>
        {startTime && endTime && (
          <div className="text-gray-400 text-[10px]">
            {formatTime(startTime)} - {formatTime(endTime)}
          </div>
        )}
      </div>

      {/* Status icons */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {isLocked && (
          <Lock className="w-3 h-3 text-amber-400" />
        )}
        {!isLocked && (
          <div {...attributes} {...listeners}>
            <GripVertical className="w-3 h-3 text-gray-500 hover:text-gray-300" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DraggableShift;
