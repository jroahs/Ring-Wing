import React from 'react';
import { useDroppable } from '@dnd-kit/core';

const DroppableDay = ({ 
  id, 
  children, 
  staffId, 
  date, 
  isWeekend = false, 
  isHoliday = false,
  isRestDay = false 
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

  return (
    <div
      ref={setNodeRef}
      className={`
        w-28 min-w-[7rem] min-h-[4rem] p-1 border-r border-gray-700/50
        transition-colors duration-150
        ${isWeekend ? 'bg-gray-800/30' : ''}
        ${isHoliday ? 'bg-red-900/10' : ''}
        ${isRestDay ? 'bg-amber-900/10' : ''}
        ${isOver ? 'bg-blue-500/20 border-blue-500' : ''}
      `}
    >
      {children}
    </div>
  );
};

export default DroppableDay;
