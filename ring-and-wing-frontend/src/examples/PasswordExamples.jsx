import React from 'react';
import { PasswordInput, PasswordVisibilityToggle, usePasswordVisibility } from '../components/ui';

// Example 1: Using the complete PasswordInput component (recommended)
export const PasswordExample1 = () => {
  const [password, setPassword] = React.useState('');

  return (
    <div className="space-y-4 max-w-md mx-auto p-6">
      <h2 className="text-xl font-bold text-gray-800">Password Input Examples</h2>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">1. Complete PasswordInput Component</h3>
        <PasswordInput
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="w-full"
        />
      </div>
    </div>
  );
};

// Example 2: Using the standalone hook and toggle (for custom implementations)
export const PasswordExample2 = () => {
  const [password, setPassword] = React.useState('');
  const { showPassword, togglePasswordVisibility, inputType } = usePasswordVisibility();

  return (
    <div className="space-y-4 max-w-md mx-auto p-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">2. Custom Implementation with Hook</h3>
        <div className="relative">
          <input
            type={inputType}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full p-2 border border-gray-300 rounded-lg pr-10 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">
            <PasswordVisibilityToggle
              showPassword={showPassword}
              onToggle={togglePasswordVisibility}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Example 3: Multiple password fields in a form
export const PasswordFormExample = () => {
  const [formData, setFormData] = React.useState({
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <div className="space-y-4 max-w-md mx-auto p-6">
      <h3 className="text-lg font-semibold mb-2">3. Form with Multiple Password Fields</h3>
      
      <PasswordInput
        label="Password"
        value={formData.password}
        onChange={handleInputChange('password')}
        placeholder="Enter password"
        className="w-full"
      />
      
      <PasswordInput
        label="Confirm Password"
        value={formData.confirmPassword}
        onChange={handleInputChange('confirmPassword')}
        placeholder="Confirm password"
        className="w-full"
      />
      
      <button className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors">
        Create Account
      </button>
    </div>
  );
};

export default PasswordExample1;
