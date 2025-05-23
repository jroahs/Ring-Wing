// src/App.js
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import Chatbot from './Chatbot';
import InventorySystem from './InventorySystem';
import OrderSystem from './OrderSystem';
import Sidebar from './Sidebar';
import MenuManagement from './MenuManagement'; // Add this import

// Define your color scheme (adjust as needed)
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


const MainLayout = () => {
  return (
    <div className="flex min-h-screen">
      <Sidebar colors={colors} />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        {/* Routes with Sidebar */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard colors={colors} />} />
          <Route path="/orders" element={<OrderSystem />} />
          <Route path="/inventory" element={<InventorySystem />} />
          {/* Add Menu Management route */}
          <Route 
            path="/menu" 
            element={<MenuManagement colors={colors} />} 
          />
        </Route>
        {/* Chatbot route without sidebar */}
        <Route path="/chatbot" element={<Chatbot />} />
      </Routes>
    </Router>
  );
}

export default App;