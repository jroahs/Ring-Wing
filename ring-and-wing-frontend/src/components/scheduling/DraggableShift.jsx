import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { GripVertical, Lock, Moon } from 'lucide-react';

const DraggableShift = ({ schedule, isDragging = false, theme = {}, viewMode = 'week' }) => {
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

  const defaultTheme = {
    text: '#1a1a1a',
    muted: '#6b7280',
    border: '#e5e0df',
    background: '#f9fafb',
    primary: '#f1670f',
    accent: '#f1670f',
    warning: '#f59e0b'
  };

  const t = { ...defaultTheme, ...theme };

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
        style={{
          ...style,
          backgroundColor: `${t.muted}15`,
          color: t.muted
        }}
        className={`
          flex items-center justify-center gap-1 p-1 rounded text-xs
          ${isDragging || isDndDragging ? 'opacity-75 shadow-lg' : ''}
        `}
      >
        <Moon className="w-3 h-3" />
        <span>Rest</span>
      </div>
    );
  }

  const shiftColor = shiftTemplate?.color || t.primary;

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: `${shiftColor}15`,
        border: `1px solid ${shiftColor}40`
      }}
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
        style={{ backgroundColor: shiftColor }}
      />

      {/* Shift info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate" style={{ color: t.text }}>
          {shiftTemplate?.name || 'Custom'}
        </div>
        {startTime && endTime && (
          <div className="text-[10px]" style={{ color: t.muted }}>
            {formatTime(startTime)} - {formatTime(endTime)}
          </div>
        )}
      </div>

      {/* Status icons */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {isLocked && (
          <Lock className="w-3 h-3" style={{ color: t.warning }} />
        )}
        {!isLocked && (
          <div {...attributes} {...listeners}>
            <GripVertical className="w-3 h-3 hover:opacity-70" style={{ color: t.muted }} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DraggableShift;
