import { useState, useEffect } from 'react';
import { theme } from '../../theme';
import { Card } from './Card';
import { Button } from './Button';
import { FiClock, FiCheck } from 'react-icons/fi';

export const TimeSlotPicker = ({
  slots,
  selectedSlot,
  onSelect,
  minTime = '08:00',
  maxTime = '22:00',
  interval = 30,
  className = ''
}) => {
  const [timeSlots, setTimeSlots] = useState([]);
  const [activeHour, setActiveHour] = useState(null);

  useEffect(() => {
    const generatedSlots = generateTimeSlots(minTime, maxTime, interval);
    setTimeSlots(generatedSlots);
    
    // Set active hour based on current time
    const now = new Date();
    const currentHour = now.getHours();
    setActiveHour(currentHour);
  }, [minTime, maxTime, interval]);

  const generateTimeSlots = (start, end, intervalMinutes) => {
    const slots = [];
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    
    let currentTime = new Date();
    currentTime.setHours(startHour, startMinute, 0);
    
    const endTime = new Date();
    endTime.setHours(endHour, endMinute, 0);
    
    while (currentTime <= endTime) {
      slots.push(formatTime(currentTime));
      currentTime.setMinutes(currentTime.getMinutes() + intervalMinutes);
    }
    
    return slots;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const isSlotAvailable = (slot) => {
    return !slots || slots.includes(slot);
  };

  const getSlotVariant = (slot) => {
    if (slot === selectedSlot) return 'primary';
    if (!isSlotAvailable(slot)) return 'disabled';
    return 'secondary';
  };

  const hours = [...new Set(timeSlots.map(slot => {
    const [time, period] = slot.split(' ');
    const [hour] = time.split(':');
    return `${hour} ${period}`;
  }))];

  return (
    <Card className={className}>
      {/* Hours Navigation */}
      <div 
        className="flex overflow-x-auto p-2 gap-2 border-b sticky top-0"
        style={{ borderColor: theme.colors.muted + '20' }}
      >
        {hours.map((hour) => (
          <Button
            key={hour}
            variant={hour.split(' ')[0] == activeHour ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => {
              const hourElement = document.getElementById(`hour-${hour.replace(' ', '-')}`);
              if (hourElement) {
                hourElement.scrollIntoView({ behavior: 'smooth' });
              }
              setActiveHour(hour.split(' ')[0]);
            }}
          >
            {hour}
          </Button>
        ))}
      </div>

      {/* Time Slots Grid */}
      <div className="p-4 space-y-4">
        {hours.map((hour) => {
          const hourSlots = timeSlots.filter(slot => slot.includes(hour));
          
          return (
            <div 
              key={hour} 
              id={`hour-${hour.replace(' ', '-')}`}
              className="space-y-2"
            >
              <div 
                className="flex items-center gap-2 sticky top-16 py-2"
                style={{ backgroundColor: theme.colors.background }}
              >
                <FiClock 
                  className="w-4 h-4"
                  style={{ color: theme.colors.accent }}
                />
                <span 
                  className="text-sm font-medium"
                  style={{ color: theme.colors.primary }}
                >
                  {hour}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {hourSlots.map((slot) => {
                  const isAvailable = isSlotAvailable(slot);
                  const isSelected = slot === selectedSlot;
                  
                  return (
                    <button
                      key={slot}
                      onClick={() => isAvailable && onSelect(slot)}
                      className={`
                        py-2 px-3 rounded-lg text-sm font-medium
                        transition-all duration-200
                        ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                        ${isSelected ? 'ring-2' : ''}
                      `}
                      style={{
                        backgroundColor: isSelected 
                          ? theme.colors.accent 
                          : isAvailable 
                            ? theme.colors.activeBg 
                            : theme.colors.muted + '20',
                        color: isSelected 
                          ? theme.colors.background 
                          : theme.colors.primary,
                        ringColor: theme.colors.accent
                      }}
                      disabled={!isAvailable}
                    >
                      <span className="flex items-center justify-center gap-1">
                        {slot.split(' ')[1]}
                        {isSelected && <FiCheck className="w-4 h-4" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};