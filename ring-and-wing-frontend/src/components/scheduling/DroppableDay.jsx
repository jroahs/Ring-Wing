import React from 'react';
import { useDroppable } from '@dnd-kit/core';

const DroppableDay = ({ 
  id, 
  children, 
  staffId, 
  date, 
  isWeekend = false, 
  isHoliday = false,
  isRestDay = false,
  theme = {},
  viewMode = 'week'
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      staffId,
      date,
      isWeekend,
      isHoliday,
      isRestDay
    }
  });

  const defaultTheme = {
    border: '#e5e0df',
    danger: '#ef4444',
    warning: '#f59e0b',
    accent: '#f1670f'
  };

  const t = { ...defaultTheme, ...theme };

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[4rem] p-1 border-r transition-colors duration-150 ${
        viewMode === 'week' ? 'flex-1 min-w-[100px]' : 'w-24 min-w-[6rem] flex-shrink-0'
      }`}
      style={{
        borderColor: t.border,
        backgroundColor: isOver 
          ? `${t.accent}20` 
          : isHoliday 
            ? `${t.danger}05` 
            : isRestDay 
              ? `${t.warning}05` 
              : isWeekend 
                ? '#f9f9f9' 
                : 'transparent'
      }}
    >
      {children}
    </div>
  );
};

export default DroppableDay;
