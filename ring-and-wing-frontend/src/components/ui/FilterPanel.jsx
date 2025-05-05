import { useState, useEffect } from 'react';
import { theme } from '../../theme';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { FiFilter, FiX, FiCheck, FiCalendar } from 'react-icons/fi';

export const FilterPanel = ({
  filters,
  activeFilters,
  onFilterChange,
  dateRange,
  onDateRangeChange,
  showDateFilter = true,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(activeFilters);
  const [localDateRange, setLocalDateRange] = useState(dateRange);

  useEffect(() => {
    setLocalFilters(activeFilters);
  }, [activeFilters]);

  useEffect(() => {
    setLocalDateRange(dateRange);
  }, [dateRange]);

  const handleFilterToggle = (category, value) => {
    const newFilters = { ...localFilters };
    if (!newFilters[category]) {
      newFilters[category] = [];
    }

    const index = newFilters[category].indexOf(value);
    if (index === -1) {
      newFilters[category].push(value);
    } else {
      newFilters[category].splice(index, 1);
      if (newFilters[category].length === 0) {
        delete newFilters[category];
      }
    }

    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
    if (showDateFilter && onDateRangeChange) {
      onDateRangeChange(localDateRange);
    }
    setIsExpanded(false);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    if (showDateFilter) {
      setLocalDateRange({ start: '', end: '' });
    }
  };

  const getActiveFilterCount = () => {
    let count = 0;
    Object.values(localFilters).forEach(values => {
      count += values.length;
    });
    if (showDateFilter && (localDateRange?.start || localDateRange?.end)) {
      count++;
    }
    return count;
  };

  return (
    <Card className={className}>
      <div className="p-4">
        {/* Header */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <FiFilter 
              className="w-4 h-4"
              style={{ color: theme.colors.accent }}
            />
            <h3 
              className="text-sm font-medium"
              style={{ color: theme.colors.primary }}
            >
              Filters
            </h3>
            {getActiveFilterCount() > 0 && (
              <span 
                className="px-2 py-0.5 text-xs font-medium rounded-full"
                style={{ 
                  backgroundColor: theme.colors.accent,
                  color: theme.colors.background
                }}
              >
                {getActiveFilterCount()}
              </span>
            )}
          </div>

          <button
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
            style={{ color: theme.colors.primary }}
          >
            <svg
              className={`w-4 h-4 transform transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              viewBox="0 0 24 24"
            >
              <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Filter Content */}
        <div 
          className={`space-y-4 overflow-hidden transition-all duration-300 ${
            isExpanded ? 'mt-4' : 'h-0 mt-0'
          }`}
        >
          {/* Date Range Filter */}
          {showDateFilter && (
            <div>
              <h4 
                className="text-xs font-medium uppercase tracking-wider mb-2"
                style={{ color: theme.colors.muted }}
              >
                Date Range
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Input
                    type="date"
                    value={localDateRange?.start || ''}
                    onChange={(e) => setLocalDateRange({
                      ...localDateRange,
                      start: e.target.value
                    })}
                    icon={<FiCalendar />}
                    placeholder="Start date"
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    value={localDateRange?.end || ''}
                    onChange={(e) => setLocalDateRange({
                      ...localDateRange,
                      end: e.target.value
                    })}
                    icon={<FiCalendar />}
                    placeholder="End date"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Filter Categories */}
          {Object.entries(filters).map(([category, values]) => (
            <div key={category}>
              <h4 
                className="text-xs font-medium uppercase tracking-wider mb-2"
                style={{ color: theme.colors.muted }}
              >
                {category}
              </h4>
              <div className="flex flex-wrap gap-2">
                {values.map((value) => {
                  const isActive = localFilters[category]?.includes(value);
                  
                  return (
                    <button
                      key={value}
                      onClick={() => handleFilterToggle(category, value)}
                      className={`
                        py-1 px-3 rounded-full text-sm font-medium
                        transition-all duration-200 flex items-center gap-1
                      `}
                      style={{
                        backgroundColor: isActive 
                          ? theme.colors.accent 
                          : theme.colors.activeBg,
                        color: isActive 
                          ? theme.colors.background 
                          : theme.colors.primary
                      }}
                    >
                      {isActive && (
                        <FiCheck className="w-3 h-3" />
                      )}
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: theme.colors.muted + '20' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearFilters}
              disabled={getActiveFilterCount() === 0}
            >
              <FiX className="w-4 h-4 mr-1" />
              Clear All
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};