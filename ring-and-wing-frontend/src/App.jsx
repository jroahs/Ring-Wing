import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { useState, useEffect } from 'react';
import 'react-toastify/dist/ReactToastify.css';
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
import TimeClock from './TimeClock';
import RevenueReportsPage from './RevenueReportsPage';
import TimeClockInterface from './TimeClockInterface';
import api, { checkApiHealth, startHealthMonitoring } from './services/apiService';
import axios from 'axios';

// API URL configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Connection states
const ConnectionStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting'
};

// Custom component for connection status indicator
const ConnectionStatusIndicator = ({ status }) => {
  if (status === ConnectionStatus.CONNECTED) {
    return null;
  }
  
  const statusStyles = {
    [ConnectionStatus.DISCONNECTED]: 'bg-red-500',
    [ConnectionStatus.RECONNECTING]: 'bg-yellow-500'
  };
  
  const statusMessages = {
    [ConnectionStatus.DISCONNECTED]: 'Disconnected from server',
    [ConnectionStatus.RECONNECTING]: 'Reconnecting...'
  };
  
  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg text-white ${statusStyles[status]}`}>
      <span className="flex items-center">
        <span className="inline-block w-2 h-2 mr-2 rounded-full bg-white animate-pulse"></span>
        {statusMessages[status]}
      </span>
    </div>
  );
};

// Basic authentication check
const ProtectedRoute = ({ children }) => {
  const authToken = localStorage.getItem('authToken');
  const navigate = useNavigate();
  const [connectionStatus, setConnectionStatus] = useState(ConnectionStatus.CONNECTED);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Validate the token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!authToken) {
        setIsValidatingToken(false);
        return;
      }

      try {
        // Call an endpoint that requires authentication
        const response = await axios.get(`${API_URL}/api/health/protected`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (response.data && response.data.success) {
          setIsAuthenticated(true);
        } else {
          // Invalid token, clear it
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
        }
      } catch (error) {
        console.error('Token validation failed:', error);
        // Clear invalid token
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateToken();
  }, [authToken]);

  useEffect(() => {
    // Connection status change handler
    const handleConnectionStatusChange = (isConnected) => {
      if (isConnected) {
        if (connectionStatus !== ConnectionStatus.CONNECTED) {
          toast.success("Connection restored!");
          setConnectionStatus(ConnectionStatus.CONNECTED);
          setReconnectAttempts(0);
        }
      } else {
        if (connectionStatus === ConnectionStatus.CONNECTED) {
          toast.error("Connection lost. Attempting to reconnect...");
          setConnectionStatus(ConnectionStatus.RECONNECTING);
        } else {
          // Already in reconnecting state, increment attempts
          setReconnectAttempts(prev => prev + 1);
          
          // After multiple attempts, mark as fully disconnected
          if (reconnectAttempts >= 5) {
            setConnectionStatus(ConnectionStatus.DISCONNECTED);
            toast.error("Server unreachable. Please check your connection.");
          }
        }
      }
    };

    // Start health monitoring with automatic reconnection
    const stopMonitoring = startHealthMonitoring(handleConnectionStatusChange);
    
    // Clean up function
    return () => {
      stopMonitoring();
    };
  }, [connectionStatus, reconnectAttempts]);

  useEffect(() => {
    // Set up token refresh logic here if needed
    const refreshTokenInterval = setInterval(() => {
      // Logic to refresh token silently
    }, 15 * 60 * 1000); // every 15 minutes
    
    return () => clearInterval(refreshTokenInterval);
  }, []);

  // Show loading while validating token
  if (isValidatingToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!authToken || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {children}
      <ConnectionStatusIndicator status={connectionStatus} />
    </>
  );
};

// Role-based route protection
const RoleProtectedRoute = ({ requiredRole, children }) => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{"role":"staff"}');
  const userRole = userData?.role || 'staff';
  
  // Check if user role matches required role
  if (requiredRole && requiredRole !== userRole) {
    // Show unauthorized message and redirect to appropriate page based on role
    toast.error("You don't have permission to access this page");
    return <Navigate to={userRole === 'staff' ? '/dashboard' : '/dashboard'} replace />;
  }
  
  return <>{children}</>;
};

// Position-based protection for inventory access
const PositionProtectedRoute = ({ requiredPositions, children }) => {
  const userData = JSON.parse(localStorage.getItem('userData') || '{"position":"cashier"}');
  const userPosition = userData?.position || 'cashier';
    // Check if user position is in the required positions array
  if (requiredPositions && !requiredPositions.includes(userPosition)) {
    toast.error("You don't have permission to access this feature");
    
    // Redirect based on user position
    if (userPosition === 'cashier') {
      return <Navigate to="/pos" replace />;
    } else if (userPosition === 'inventory') {
      return <Navigate to="/inventory" replace />;
    } else if (['shift_manager', 'general_manager', 'admin'].includes(userPosition)) {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/pos" replace />;
    }
  }
  
  return <>{children}</>;
};

const MainLayout = () => {
  const [showTimeClock, setShowTimeClock] = useState(false);
  const [userData, setUserData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const storedData = localStorage.getItem('userData');
    if (storedData) {
      setUserData(JSON.parse(storedData));
    }
  }, []);  const handleSidebarToggle = (isOpen, mobile) => {
    setSidebarOpen(isOpen);
    setIsMobile(mobile);
  };

  // Small global margin to account for sidebar
  const getContentMargin = () => {
    if (isMobile) {
      return '0'; // No margin on mobile
    }
    
    // Small, consistent margin for desktop
    if (windowWidth >= 1920) {
      return '6rem'; // Slightly larger for big screens
    } else {
      return '4rem'; // Smaller margin for normal desktop
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <Sidebar 
          colors={colors} 
          onTimeClockClick={() => setShowTimeClock(true)}
          onSidebarToggle={handleSidebarToggle}
        />        <div 
          className="flex-1 transition-all duration-300 ease-in-out"
          style={{ 
            marginLeft: getContentMargin()
          }}
        >
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

// Theme colors
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        
        {/* Customer-facing routes - not protected */}
        <Route path="/self-checkout" element={<SelfCheckout />} />
        
        {/* Chatbot is semi-protected - only authenticated users */}
        <Route path="/chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
          {/* All admin/dashboard routes are protected by MainLayout */}
        <Route element={<MainLayout />}>          {/* Routes accessible by managers and admin */}
          <Route path="/dashboard" element={
            <PositionProtectedRoute requiredPositions={['shift_manager', 'general_manager', 'admin']}>
              <Dashboard colors={colors} />
            </PositionProtectedRoute>
          } />
          
          {/* POS routes - accessible by cashiers and managers */}
          <Route path="/pos" element={
            <PositionProtectedRoute requiredPositions={['cashier', 'shift_manager', 'general_manager', 'admin']}>
              <PointofSale />
            </PositionProtectedRoute>
          } />
          <Route path="/orders" element={
            <PositionProtectedRoute requiredPositions={['cashier', 'shift_manager', 'general_manager', 'admin']}>
              <OrderSystem />
            </PositionProtectedRoute>
          } />
          
          {/* Time clock accessible to all */}
          <Route path="/timeclock" element={<TimeClock />} />
          
          {/* Inventory routes - only for inventory staff and managers */}
          <Route path="/inventory" element={
            <PositionProtectedRoute requiredPositions={['inventory', 'shift_manager', 'general_manager', 'admin']}>
              <InventorySystem />
            </PositionProtectedRoute>
          } />
          
          {/* Menu management - managers only */}
          <Route path="/menu" element={
            <PositionProtectedRoute requiredPositions={['shift_manager', 'general_manager', 'admin']}>
              <MenuManagement colors={colors} />
            </PositionProtectedRoute>
          } />
            {/* Manager-only routes */}
          <Route path="/employees" element={
            <PositionProtectedRoute requiredPositions={['shift_manager', 'general_manager', 'admin']}>
              <EmployeeManagement colors={colors} />
            </PositionProtectedRoute>
          } />
          <Route path="/payroll" element={
            <PositionProtectedRoute requiredPositions={['shift_manager', 'general_manager', 'admin']}>
              <PayrollSystem />
            </PositionProtectedRoute>
          } />
          <Route path="/expenses" element={
            <PositionProtectedRoute requiredPositions={['shift_manager', 'general_manager', 'admin']}>
              <ExpenseTracker colors={colors} />
            </PositionProtectedRoute>
          } />
          <Route path="/revenue-reports" element={
            <PositionProtectedRoute requiredPositions={['shift_manager', 'general_manager', 'admin']}>
              <RevenueReportsPage />
            </PositionProtectedRoute>
          } />
          <Route path="/reports" element={
            <PositionProtectedRoute requiredPositions={['shift_manager', 'general_manager', 'admin']}>
              <RevenueReportsPage />
            </PositionProtectedRoute>
          } />
        </Route>
        
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
