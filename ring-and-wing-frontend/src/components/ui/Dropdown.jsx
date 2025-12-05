import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaCheck } from 'react-icons/fa';

/**
 * Global Dropdown Component
 * 
 * A reusable dropdown component with white background and orange accent.
 * Supports single and multi-select modes, search, and custom rendering.
 * 
 * @param {Object} props
 * @param {Array} props.options - Array of options: [{ value, label, icon?, disabled? }] or strings
 * @param {any} props.value - Selected value (or array for multi-select)
 * @param {Function} props.onChange - Callback when selection changes
 * @param {string} props.placeholder - Placeholder text when nothing selected
 * @param {boolean} props.disabled - Disable the dropdown
 * @param {boolean} props.searchable - Enable search/filter functionality
 * @param {boolean} props.multi - Enable multi-select mode
 * @param {boolean} props.clearable - Show clear button when value is selected
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg'
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.error - Error message to display
 * @param {string} props.label - Label text above dropdown
 * @param {Function} props.renderOption - Custom option renderer
 * @param {Function} props.renderSelected - Custom selected value renderer
 * @param {number} props.maxHeight - Maximum height of dropdown menu (default: 256)
 */
const Dropdown = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  searchable = false,
  multi = false,
  clearable = false,
  size = 'md',
  className = '',
  error = '',
  label = '',
  renderOption,
  renderSelected,
  maxHeight = 256,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options to { value, label } format
  const normalizedOptions = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Filter options based on search term
  const filteredOptions = searchTerm
    ? normalizedOptions.filter(opt => 
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : normalizedOptions;

  // Get selected option(s)
  const getSelectedOption = (val) => normalizedOptions.find(opt => opt.value === val);
  
  const selectedOptions = multi
    ? (Array.isArray(value) ? value : []).map(getSelectedOption).filter(Boolean)
    : getSelectedOption(value);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Handle option selection
  const handleSelect = (option) => {
    if (option.disabled) return;

    if (multi) {
      const currentValues = Array.isArray(value) ? value : [];
      const isSelected = currentValues.includes(option.value);
      const newValues = isSelected
        ? currentValues.filter(v => v !== option.value)
        : [...currentValues, option.value];
      onChange(newValues);
    } else {
      onChange(option.value);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Handle clear
  const handleClear = (e) => {
    e.stopPropagation();
    onChange(multi ? [] : null);
  };

  // Size variants
  const sizeClasses = {
    sm: 'py-1.5 px-3 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-5 text-lg'
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  // Render display value
  const renderDisplayValue = () => {
    if (multi) {
      if (selectedOptions.length === 0) {
        return <span className="text-gray-400">{placeholder}</span>;
      }
      if (renderSelected) {
        return renderSelected(selectedOptions);
      }
      return (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map(opt => (
            <span 
              key={opt.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-sm"
            >
              {opt.label}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(opt);
                }}
                className="hover:text-orange-900 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      );
    }

    if (!selectedOptions) {
      return <span className="text-gray-400">{placeholder}</span>;
    }

    if (renderSelected) {
      return renderSelected(selectedOptions);
    }

    return (
      <span className="flex items-center gap-2">
        {selectedOptions.icon && <span>{selectedOptions.icon}</span>}
        {selectedOptions.label}
      </span>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef} {...props}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2
          bg-white border rounded-lg
          ${sizeClasses[size]}
          ${disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
            : 'hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 cursor-pointer'
          }
          ${error ? 'border-red-500' : isOpen ? 'border-orange-500 ring-2 ring-orange-500 ring-opacity-50' : 'border-gray-300'}
          transition-all duration-200
        `}
      >
        <div className="flex-1 text-left truncate">
          {renderDisplayValue()}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Clear button */}
          {clearable && (multi ? selectedOptions.length > 0 : value) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              ×
            </button>
          )}
          
          {/* Chevron */}
          <FaChevronDown 
            className={`
              ${iconSizes[size]} text-gray-400 transition-transform duration-200
              ${isOpen ? 'transform rotate-180' : ''}
            `}
          />
        </div>
      </button>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          style={{ maxHeight: maxHeight }}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
              />
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto" style={{ maxHeight: searchable ? maxHeight - 56 : maxHeight }}>
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                {searchTerm ? 'No matches found' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = multi
                  ? (Array.isArray(value) && value.includes(option.value))
                  : value === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    disabled={option.disabled}
                    className={`
                      w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left
                      ${option.disabled 
                        ? 'text-gray-300 cursor-not-allowed bg-gray-50' 
                        : isSelected
                          ? 'bg-orange-50 text-orange-700'
                          : 'text-gray-700 hover:bg-orange-50 hover:text-orange-600'
                      }
                      transition-colors duration-150
                    `}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {option.icon && <span className="text-gray-400">{option.icon}</span>}
                      {renderOption ? renderOption(option, isSelected) : option.label}
                    </span>

                    {isSelected && (
                      <FaCheck className="text-orange-500 flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
