import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FiUser, FiLock, FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import { Button, Input, PasswordInput } from './components/ui';
import logo from './assets/rw.jpg';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef(null);
  const navigate = useNavigate();

  // Theme colors
  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  const buttonVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    },
    hover: {
      scale: 1.05,
      boxShadow: "0px 5px 10px rgba(0,0,0,0.2)"
    },
    tap: {
      scale: 0.95
    }
  };

  // Attempt login with credentials
  const attemptLogin = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (isLoading) return;
    
    // Validate form fields
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Use a direct axios call that won't be affected by global interceptors
      const response = await axios({
        method: 'post',
        url: `${API_URL}/api/auth/login`,
        data: {
          username: username.toLowerCase(),
          password
        },
        validateStatus: function (status) {
          // Allow any status code to resolve rather than reject
          return true;
        }
      });

      // Check for error responses
      if (response.status !== 200) {
        const errorMessage = response.data?.message || 'Login failed';
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      const { data } = response;

      // Store token
      localStorage.setItem('authToken', data.token);
        // Store user data
      localStorage.setItem('userData', JSON.stringify({
        id: data._id,
        username: data.username,
        email: data.email,
        role: data.role,
        position: data.position, // Add position field
        reportsTo: data.reportsTo
      }));

      // Configure axios defaults for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;      // Navigate to appropriate page based on position
      console.log('User position:', data.position);
      
      switch (data.position) {
        case 'inventory':
          console.log('Redirecting inventory staff to inventory page');
          navigate('/inventory');
          break;
        case 'shift_manager':
        case 'general_manager':
        case 'admin':
          console.log('Redirecting manager/admin to dashboard');
          navigate('/dashboard');
          break;
        case 'cashier':
        default:
          console.log('Redirecting cashier to POS');
          navigate('/pos');
          break;
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('Server connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle input changes and clear errors
  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    if (error) setError('');
  };

  // Form submit handler with strict preventDefault
  const handleSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopPropagation(); // Also stop propagation to be extra safe
    }
    attemptLogin();
    return false; // Just to be extra safe
  };

  // For the button click handler
  const handleButtonClick = () => {
    attemptLogin();
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="w-full max-w-md px-4">
        <motion.div 
          className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-28 h-28 mb-4 rounded-full overflow-hidden border-2 border-red-200 shadow-lg">
              <img
                src={logo}
                alt="Ring & Wing Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Ring & Wing</h1>
            <p className="text-sm text-gray-600">Management System</p>
          </div>

          {/* Login Form Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back</h2>
            <p className="text-sm text-gray-600">
              Access your workspace - For Staff & Management
            </p>
          </div>

          {error && (
            <motion.div 
              className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex justify-between items-center"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
            >
              <div className="flex items-center">
                <FiAlertCircle className="text-red-500 mr-2 flex-shrink-0" />
                <span className="text-red-700">{error}</span>
              </div>
              <button 
                type="button"
                onClick={() => setError('')}
                className="text-red-500 hover:text-red-700 transition-colors"
                aria-label="Dismiss error"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </motion.div>
          )}

          <div className="space-y-5">
            <motion.div className="mb-6" variants={itemVariants}>              <Input
                label="Username"
                type="text"
                value={username}
                onChange={handleInputChange(setUsername)}
                placeholder="Enter your username"
                disabled={isLoading}
                required
                autoComplete="username"
                error={error && error.includes('username') ? error : ''}
              />
            </motion.div>

            <motion.div className="mb-8" variants={itemVariants}>              <PasswordInput
                label="Password"
                value={password}
                onChange={handleInputChange(setPassword)}
                placeholder="Enter your password"
                disabled={isLoading}
                required
                autoComplete="current-password"
                error={error && error.includes('password') ? error : ''}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleButtonClick();
                  }
                }}
              />
            </motion.div>

            <motion.button
              type="button" 
              className="w-full py-3 rounded-lg font-medium flex items-center justify-center"
              style={{ 
                backgroundColor: colors.accent,
                color: 'white' 
              }}
              onClick={handleButtonClick}
              disabled={isLoading}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </motion.div>
              ) : (
                <>
                  <span>Sign In</span>
                  <motion.div
                    initial={{ x: -5, opacity: 0.5 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                      repeat: Infinity,
                      repeatType: "reverse",
                      duration: 0.6
                    }}
                  >
                    <FiArrowRight className="ml-2" />
                  </motion.div>
                </>
              )}
            </motion.button>
          </div>

          <motion.p 
            className="text-center mt-8 text-sm"
            style={{ color: colors.muted }}
            variants={itemVariants}
          >
            © {new Date().getFullYear()} Ring & Wing. All rights reserved.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;