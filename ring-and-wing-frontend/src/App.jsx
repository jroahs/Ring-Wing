import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
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
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
        </Route>

        <Route path="/chatbot" element={<Chatbot />} />
        <Route path="/self-checkout" element={<SelfCheckout />} />
        
        <Route path="*" element={<div>404 Not Found</div>} />
      </Routes>
    </Router>
  );
}

export default App;
