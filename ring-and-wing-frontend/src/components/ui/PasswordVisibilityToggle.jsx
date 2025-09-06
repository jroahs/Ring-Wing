import { useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export const PasswordVisibilityToggle = ({
  showPassword,
  onToggle,
  className = '',
  size = 20,
  color = '#6b7280'
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors p-1 rounded ${className}`}
      tabIndex={-1}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? (
        <FiEyeOff size={size} color={color} />
      ) : (
        <FiEye size={size} color={color} />
      )}
    </button>
  );
};

export const usePasswordVisibility = (initialState = false) => {
  const [showPassword, setShowPassword] = useState(initialState);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return {
    showPassword,
    togglePasswordVisibility,
    inputType: showPassword ? 'text' : 'password'
  };
};

export default PasswordVisibilityToggle;
