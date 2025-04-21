import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import logo from './assets/rw.jpg';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
  
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
  
      // Store user data and token
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify({
        id: data._id,
        username: data.username,
        email: data.email
      }));
  
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4" style={{ backgroundColor: '#fefdfd' }}>
      <div
        className="w-full max-w-md px-8 py-12 rounded-2xl shadow-xl border"
        style={{
          backgroundColor: '#fefdfd',
          borderColor: '#ac9c9b',
          minHeight: '520px', // Fixed height
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header Section - Fixed Space */}
        <div className="mb-10 text-center" style={{ minHeight: '120px' }}>
          <div className="flex justify-center mb-4">
            {/* Circle container sized at 75px */}
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                backgroundColor: '#2e0304',
                width: '75px',
                height: '75px',
                overflow: 'hidden' // ensures the image is clipped to the circle
              }}
            >
              <img
                src={logo}
                alt="Ring & Wing Logo"
                className="rounded-full object-contain w-full h-full"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#2e0304' }}>
            Ring & Wing Café
          </h1>
          <p className="text-sm" style={{ color: '#853619' }}>
            Management System
          </p>
        </div>

        {/* Error Message - Fixed Space (empty when no error) */}
        <div className="mb-4 min-h-[40px] flex items-center justify-center">
          {error && (
            <div
              className="w-full p-2 text-sm text-center rounded-md"
              style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Form Section - Fixed Space */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium mb-1"
                style={{ color: '#2e0304' }}
              >
                Staff ID
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your staff ID"
                className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:outline-none"
                style={{
                  backgroundColor: '#fefdfd',
                  borderColor: '#ac9c9b',
                  color: '#2e0304',
                  focusRingColor: '#f1670f',
                  placeholderColor: '#ac9c9b'
                }}
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
                style={{ color: '#2e0304' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:outline-none"
                  style={{
                    backgroundColor: '#fefdfd',
                    borderColor: '#ac9c9b',
                    color: '#2e0304',
                    focusRingColor: '#f1670f',
                    placeholderColor: '#ac9c9b'
                  }}
                  autoComplete="current-password"
                  minLength="8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#853619' }}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 font-medium rounded-lg transition-all duration-200 
                        disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: '#f1670f',
                color: '#fefdfd',
                hoverBackgroundColor: '#e05b0c'
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Authenticating...
                </span>
              ) : (
                'Access System'
              )}
            </button>
          </div>
        </form>

        {/* Footer - Fixed Space */}
        <div className="mt-8 text-center text-xs" style={{ color: '#853619' }}>
          <p>Having trouble? Contact your supervisor</p>
          <p className="mt-1">
            System Version: 1.0 | {new Date().getFullYear()} Ring & Wing Café
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
