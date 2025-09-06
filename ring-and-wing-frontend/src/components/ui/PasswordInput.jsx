import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { Input } from './Input';

export const PasswordInput = ({
  label = 'Password',
  placeholder = 'Enter password',
  showPasswordToggle = true,
  className = '',
  error,
  style,
  useCustomStyling = false,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const PasswordToggleIcon = () => (
    <button
      type="button"
      onClick={togglePasswordVisibility}
      className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors p-1 rounded"
      tabIndex={-1}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? (
        <FiEyeOff className="h-5 w-5" />
      ) : (
        <FiEye className="h-5 w-5" />
      )}
    </button>
  );

  // If useCustomStyling is true, render with custom styling for Employee Management
  if (useCustomStyling) {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium mb-1" style={style?.color ? { color: style.color } : {}}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder={placeholder}
            className={`p-2 rounded border w-full text-sm pr-10 ${className}`}
            style={style}
            {...props}
          />
          {showPasswordToggle && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              <PasswordToggleIcon />
            </div>
          )}
        </div>
        {error && (
          <div className="text-xs text-red-500 mt-1">{error}</div>
        )}
      </div>
    );
  }

  // Default: Use the Input component for consistent styling (Login page)
  return (
    <Input
      type={showPassword ? 'text' : 'password'}
      label={label}
      placeholder={placeholder}
      className={className}
      style={style}
      error={error}
      icon={showPasswordToggle ? <PasswordToggleIcon /> : undefined}
      {...props}
    />
  );
};

export default PasswordInput;
