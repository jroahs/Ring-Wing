import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardGridMinimal } from './ui/DashboardGridMinimal';

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b',
  activeBg: '#f1670f20'
};

const DashboardMinimal = () => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    ordersToday: 0,
    averageOrderValue: 0,
    activeStaff: 0,
    salesGrowth: 0,
    ordersGrowth: 0,
    peakHours: [],
    maxHourlyOrders: 0,
    bestSellers: [],
    pendingOrders: 0,
    lowStockCount: 0
  });
  const [salesSummary, setSalesSummary] = useState({
    totalSales: 0,
    paymentMethods: {},
    orderSources: {}
  });
  const [operations, setOperations] = useState({
    monthlyDisbursements: 0,
    lowStockItems: 0
  });
  const [staffData, setStaffData] = useState({
    team: [],
    activeCount: 0
  });
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch orders
        const ordersResponse = await fetch('http://localhost:5000/api/orders');
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.data || []);
        
        // Fetch sales stats - using daily period
        const statsResponse = await fetch('http://localhost:5000/api/revenue/daily');
        const statsData = await statsResponse.json();
        const revenueData = statsData.data || {};
        
        // Fetch expenses
        const expensesResponse = await fetch('http://localhost:5000/api/expenses');
        const expensesData = await expensesResponse.json();
        
        // Process expenses for monthly disbursements
        let monthlyDisbursements = 0;
        const monthlyExpenseData = [];
        
        if (Array.isArray(expensesData)) {
          // Calculate total disbursements
          monthlyDisbursements = expensesData
            .filter(exp => exp.disbursed)
            .reduce((sum, exp) => sum + (exp.amount || 0), 0);
            
          // Group expenses by month for the chart
          const monthlyGroups = expensesData
            .filter(exp => exp.disbursed)
            .reduce((acc, exp) => {
              const date = new Date(exp.disbursementDate || exp.date);
              const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
              if (!acc[monthYear]) acc[monthYear] = 0;
              acc[monthYear] += (exp.amount || 0);
              return acc;
            }, {});
            
          // Convert to array format for chart display
          Object.entries(monthlyGroups).forEach(([monthYear, amount]) => {
            const date = new Date(monthYear + '-01');
            monthlyExpenseData.push({
              monthYear,
              amount,
              formattedMonth: date.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' })
            });
          });
          
          // Sort by date
          monthlyExpenseData.sort((a, b) => new Date(a.monthYear) - new Date(b.monthYear));
        }
        
        setMonthlyExpenses(monthlyExpenseData);
        
        // Fetch staff data
        const token = localStorage.getItem('authToken');
        const staffResponse = await fetch('http://localhost:5000/api/staff', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const staffData = await staffResponse.json();
        
        // Process staff data
        let staffList = [];
        let activeStaffCount = 0;
        
        if (Array.isArray(staffData)) {
          staffList = staffData.map(member => ({
            ...member,
            id: member._id
          })).slice(0, 5); // Get top 5 staff members
          
          activeStaffCount = staffData.filter(member => member.status === 'Active').length;
        }
        
        setStaffData({
          team: staffList,
          activeCount: activeStaffCount
        });
          
        // Update operations state with all combined data
        setOperations({
          monthlyDisbursements,
          lowStockItems: 3 // This is hardcoded in the original dashboard too
        });
        
        // Set stats with data from API or use defaults
        setStats({
          totalSales: revenueData.summary?.totalRevenue || 0,
          ordersToday: revenueData.summary?.orderCount || 0,
          averageOrderValue: revenueData.summary?.averageOrderValue || 0,
          activeStaff: activeStaffCount,
          salesGrowth: 0, // This data is not provided by the revenue API
          ordersGrowth: 0, // This data is not provided by the revenue API
          peakHours: Object.entries(revenueData.hourlyDistribution || {})
            .map(([hour, amount]) => ({ hour: parseInt(hour), amount }))
            .sort((a, b) => b.amount - a.amount),
          maxHourlyOrders: 10,
          bestSellers: revenueData.topItems || [],
          pendingOrders: 0, // This data is not provided by the revenue API
          lowStockCount: 0 // This data is not provided by the revenue API
        });
        
        // Set sales summary
        setSalesSummary({
          totalSales: revenueData.summary?.totalRevenue || 0,
          paymentMethods: revenueData.revenueByPayment || {},          orderSources: revenueData.revenueBySource || {}
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  const handleRefreshOrders = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/orders');
      const data = await response.json();
      setOrders(data.data || []);    } catch (error) {
      console.error('Error refreshing orders:', error);
    }
  };
  
  const handleViewOrder = (order) => {
    // Navigate to order details or open modal
    console.log('View order:', order);
  };    return (
    <div className="p-4">
      <DashboardGridMinimal 
        stats={stats}
        orders={orders}
        salesSummary={salesSummary}
        operations={operations}
        onRefreshOrders={handleRefreshOrders}
        onViewOrder={handleViewOrder}
        isLoading={isLoading}
        staffData={staffData}
        monthlyExpenses={monthlyExpenses}
      />
    </div>
  );
};

export default DashboardMinimal;
