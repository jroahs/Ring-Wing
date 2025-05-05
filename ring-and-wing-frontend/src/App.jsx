import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Login from './Login';
import Dashboard from './Dashboard';
import Chatbot from './Chatbot';
import InventorySystem from './InventorySystem';
import OrderSystem from './OrderSystem';
import Sidebar from './Sidebar';
import MenuManagement from './MenuManagement';
import ExpenseTracker from './ExpenseDisbursement';
import PointofSale from './PointofSale';
import SelfCheckout from './SelfCheckout';
import PayrollSystem from './PayrollSystem';
import EmployeeManagement from "./EmployeeManagement";
import TimeClock from './TimeClock';  // Import the new TimeClock component
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useState, useEffect } from 'react';
import TimeClockInterface from './TimeClockInterface';

// API URL configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Configure axios defaults
axios.defaults.baseURL = API_URL;

// Set up auth token if it exists
const token = localStorage.getItem('authToken');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Add request interceptor for auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for auth errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Skip automatic redirects if the error is from the login endpoint
    const isLoginEndpoint = error.config?.url?.includes('/api/auth/login');
    
    if (error.response?.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b',
  activeBg: '#f1670f20',
  activeBorder: '#f1670f',
  hoverBg: '#f1670f10'
};

const ProtectedRoute = ({ children }) => {
  const authToken = localStorage.getItem('authToken');
  const navigate = useNavigate();

  useEffect(() => {
    // Set up global fetch error handler
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        // Add API URL prefix if not already present
        if (typeof args[0] === 'string' && args[0].startsWith('/api')) {
          args[0] = `${API_URL}${args[0]}`;
        }

        const response = await originalFetch(...args);
        
        if (response.status === 401) {
          const data = await response.json();
          if (data.message?.includes('expired') || data.message?.includes('invalid')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            navigate('/login', { replace: true });
          }
        }
        
        return response;
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [navigate]);

  if (!authToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const MainLayout = () => {
  const [showTimeClock, setShowTimeClock] = useState(false);
  const [userData, setUserData] = useState(null);
  
  useEffect(() => {
    const storedData = localStorage.getItem('userData');
    if (storedData) {
      setUserData(JSON.parse(storedData));
    }
  }, []);
  
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar 
          colors={colors} 
          onTimeClockClick={() => setShowTimeClock(true)} 
        />
        <div className="flex-1">
          {showTimeClock && (
            <TimeClockInterface 
              onClose={() => setShowTimeClock(false)} 
            />
          )}
          <Outlet />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </div>
    </ProtectedRoute>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard colors={colors} />} />
          <Route path="/pos" element={<PointofSale />} />
          <Route path="/orders" element={<OrderSystem />} />
          <Route path="/inventory" element={<InventorySystem />} />
          <Route path="/menu" element={<MenuManagement colors={colors} />} />
          <Route path="/employees" element={<EmployeeManagement colors={colors} />} />
          <Route path="/payroll" element={<PayrollSystem />} />
          <Route path="/expenses" element={<ExpenseTracker colors={colors} />} />
          <Route path="/timeclock" element={<TimeClock />} /> {/* Add TimeClock route */}
        </Route>

        <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
        <Route path="/self-checkout" element={<SelfCheckout />} />
        
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;
