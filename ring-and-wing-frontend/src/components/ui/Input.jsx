import { useState } from 'react';

export const Input = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label 
          className="block text-sm font-medium text-gray-700 mb-1"
          htmlFor={props.id || props.name}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={`
            w-full px-4 py-2 bg-white
            border-2 rounded-lg transition-all
            placeholder:text-gray-400
            ${error ? 'border-red-500' : isFocused ? 'border-orange-500' : 'border-gray-200'}
            ${error ? 'focus:border-red-500' : 'focus:border-orange-500'}
            focus:outline-none focus:ring-2
            ${error ? 'focus:ring-red-500/20' : 'focus:ring-orange-500/20'}
            disabled:bg-gray-50 disabled:text-gray-500
            ${className}
          `.trim()}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {icon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}