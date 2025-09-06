# Password Visibility Components

This documentation describes the global password visibility toggle components that can be used throughout the Ring & Wing application instead of relying on inline website solutions.

## Components Overview

### 1. `PasswordInput` Component (Recommended)

A complete password input component that includes built-in password visibility toggle functionality.

**Usage:**
```jsx
import { PasswordInput } from './components/ui';

function LoginForm() {
  const [password, setPassword] = useState('');

  return (
    <PasswordInput
      label="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="Enter your password"
      required
    />
  );
}
```

**Props:**
- `label` (string, default: 'Password') - Label text for the input
- `placeholder` (string, default: 'Enter password') - Placeholder text
- `showPasswordToggle` (boolean, default: true) - Whether to show the toggle button
- `className` (string) - Additional CSS classes
- `error` (string) - Error message to display
- `style` (object) - Inline styles
- All standard HTML input props (value, onChange, required, etc.)

### 2. `PasswordVisibilityToggle` Component

A standalone toggle button component for custom implementations.

**Usage:**
```jsx
import { PasswordVisibilityToggle, usePasswordVisibility } from './components/ui';

function CustomPasswordInput() {
  const [password, setPassword] = useState('');
  const { showPassword, togglePasswordVisibility, inputType } = usePasswordVisibility();

  return (
    <div className="relative">
      <input
        type={inputType}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="pr-10"
      />
      <PasswordVisibilityToggle
        showPassword={showPassword}
        onToggle={togglePasswordVisibility}
      />
    </div>
  );
}
```

**Props:**
- `showPassword` (boolean, required) - Current visibility state
- `onToggle` (function, required) - Toggle handler function
- `className` (string) - Additional CSS classes
- `size` (number, default: 20) - Icon size in pixels
- `color` (string, default: '#6b7280') - Icon color

### 3. `usePasswordVisibility` Hook

A custom hook that provides password visibility state management.

**Usage:**
```jsx
import { usePasswordVisibility } from './components/ui';

function Component() {
  const { showPassword, togglePasswordVisibility, inputType } = usePasswordVisibility();
  
  return (
    <input type={inputType} />
  );
}
```

**Returns:**
- `showPassword` (boolean) - Current visibility state
- `togglePasswordVisibility` (function) - Function to toggle visibility
- `inputType` (string) - Either 'text' or 'password' for input type

## Implementation Examples

### Example 1: Login Form
```jsx
import { PasswordInput } from './components/ui';

function LoginForm() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  return (
    <form>
      <input
        type="text"
        value={credentials.username}
        onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
        placeholder="Username"
      />
      
      <PasswordInput
        label="Password"
        value={credentials.password}
        onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
        placeholder="Enter your password"
        required
      />
      
      <button type="submit">Login</button>
    </form>
  );
}
```

### Example 2: Employee Management Form
```jsx
import { PasswordInput } from './components/ui';

function EmployeeForm({ editMode }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  return (
    <form>
      <PasswordInput
        label={`Password ${editMode ? '(leave empty to keep current)' : ''}`}
        value={formData.password}
        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
        placeholder={editMode ? "Leave empty to keep current" : "Min. 8 characters"}
        required={!editMode}
      />
      
      <PasswordInput
        label="Confirm Password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
        placeholder="Re-enter password"
        required={!editMode || formData.password}
      />
    </form>
  );
}
```

### Example 3: Custom Styling
```jsx
import { PasswordInput } from './components/ui';

function CustomStyledPassword() {
  const [password, setPassword] = useState('');
  
  const colors = {
    primary: '#2e0304',
    accent: '#f1670f',
    muted: '#ac9c9b'
  };

  return (
    <PasswordInput
      label="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="p-2 rounded border w-full text-sm"
      style={{ 
        borderColor: colors.muted,
        color: colors.primary
      }}
    />
  );
}
```

## Migration Guide

### Replacing Existing Password Inputs

**Before:**
```jsx
const [showPassword, setShowPassword] = useState(false);

<input
  type={showPassword ? 'text' : 'password'}
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>
<button onClick={() => setShowPassword(!showPassword)}>
  {showPassword ? 'Hide' : 'Show'}
</button>
```

**After:**
```jsx
<PasswordInput
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>
```

### Updated Files

The following files have been updated to use the new password visibility components:

1. **`Login.jsx`** - Updated to use `PasswordInput` component
2. **`EmployeeManagement.jsx`** - Updated password and confirm password fields
3. **`StaffForm.jsx`** - Updated password input in staff form

## Benefits

✅ **Consistent UI/UX** - All password inputs have the same look and behavior  
✅ **Reduced Code Duplication** - No need to implement visibility toggle logic repeatedly  
✅ **Better Accessibility** - Built-in ARIA labels and keyboard navigation  
✅ **Easy Maintenance** - Central location for password input styling and behavior  
✅ **Flexible Implementation** - Can be used as complete component or individual parts  

## Icons Used

- **Show Password**: Eye icon (`FiEye` from react-icons/fi)
- **Hide Password**: Eye-off icon (`FiEyeOff` from react-icons/fi)

## Accessibility Features

- ARIA labels for screen readers
- Keyboard navigation support
- Focus management
- Color contrast compliance
- Semantic HTML structure

## Browser Support

The components work in all modern browsers that support:
- ES6+ JavaScript features
- React 18+
- CSS3 flexbox

## Troubleshooting

### Common Issues

1. **Icon not showing**: Make sure `react-icons` is installed and imported correctly
2. **Styling issues**: Check that Tailwind CSS or your CSS framework is properly configured
3. **State not updating**: Ensure you're passing the correct `onChange` handler

### Need Help?

If you encounter any issues with the password visibility components, please check:
1. Import statements are correct
2. Component props are properly passed
3. CSS classes are available
4. React version compatibility
