import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardGridMinimal } from './ui/DashboardGridMinimal';
import { colors } from '../theme'; // Import centralized colors

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
  });  const [salesSummary, setSalesSummary] = useState({
    totalSales: 0,
    orderSources: {}
  });
  const [monthlyRevenueSummary, setMonthlyRevenueSummary] = useState({
    totalSales: 0,
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
  const [revenueData, setRevenueData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshController, setRefreshController] = useState(null);
  
  useEffect(() => {
    const controller = new AbortController();
    
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // OPTIMIZED: Stagger API calls with delays to prevent connection pool exhaustion
        // Previously all 6 calls fired simultaneously, causing 18 connections with 3 managers
        // Now they're staggered with 250ms delays = smoother load, no pool exhaustion
        
        // Fetch orders from today only
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const ordersResponse = await fetch('http://localhost:5000/api/orders', {
          signal: controller.signal
        });
        const ordersData = await ordersResponse.json();
        
        // Filter orders to show only today's orders
        const todayOrders = (ordersData.data || []).filter(order => {
          const orderDate = new Date(order.createdAt);
          orderDate.setHours(0, 0, 0, 0);
          return orderDate.getTime() === today.getTime();
        });
        
        setOrders(todayOrders);
        
        // Delay before next call
        await new Promise(resolve => setTimeout(resolve, 250));
        
        // Fetch sales stats - using daily period to show today's data only
        const statsResponse = await fetch('http://localhost:5000/api/revenue/daily', {
          signal: controller.signal
        });
        const statsData = await statsResponse.json();
        const revenueData = statsData.data || {};

        // Delay before next call
        await new Promise(resolve => setTimeout(resolve, 250));

        // Fetch monthly revenue data for Revenue Overview section
        const monthlyStatsResponse = await fetch('http://localhost:5000/api/revenue/monthly', {
          signal: controller.signal
        });
        const monthlyStatsData = await monthlyStatsResponse.json();
        const monthlyRevenueData = monthlyStatsData.data || {};
        
        // Delay before next call
        await new Promise(resolve => setTimeout(resolve, 250));
        
        // Fetch historical monthly revenue data for the chart
        const monthlyHistoricalResponse = await fetch('http://localhost:5000/api/revenue/historical/monthly', {
          signal: controller.signal
        });
        const monthlyHistoricalData = await monthlyHistoricalResponse.json();
        
        // Delay before next call
        await new Promise(resolve => setTimeout(resolve, 250));
        
        // Prepare revenue data for charts from historical monthly data
        let chartRevenueData = [];
        
        if (monthlyHistoricalData.success && monthlyHistoricalData.data) {
          chartRevenueData = monthlyHistoricalData.data.map(monthData => ({
            period: monthData.month,
            revenue: monthData.revenue,
            orders: monthData.orders,
            formattedMonth: monthData.month
          }));
        }
        
        setRevenueData(chartRevenueData);
        
        // Delay before next call
        await new Promise(resolve => setTimeout(resolve, 250));
        
        // Fetch expenses
        const expensesResponse = await fetch('http://localhost:5000/api/expenses', {
          signal: controller.signal
        });
        const expensesData = await expensesResponse.json();
          // Process expenses for monthly disbursements (current month only)
        let monthlyDisbursements = 0;
        const monthlyExpenseData = [];
        
        if (Array.isArray(expensesData)) {
          // Get current month start and end dates
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          
          // Calculate current month disbursements only
          monthlyDisbursements = expensesData
            .filter(exp => {
              if (!exp.disbursed) return false;
              const disbursementDate = new Date(exp.disbursementDate || exp.date);
              return disbursementDate >= monthStart && disbursementDate <= monthEnd;
            })
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
        
        // Delay before final call
        await new Promise(resolve => setTimeout(resolve, 250));
        
        // Fetch staff data
        const token = localStorage.getItem('authToken');
        const staffResponse = await fetch('http://localhost:5000/api/staff', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal
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
        });        // Set sales summary (removed paymentMethods since we replaced it with monthly trend)
        setSalesSummary({
          totalSales: revenueData.summary?.totalRevenue || 0,
          orderSources: revenueData.revenueBySource || {}
        });

        // Set monthly revenue summary for Revenue Overview section
        setMonthlyRevenueSummary({
          totalSales: monthlyRevenueData.summary?.totalRevenue || 0,
          orderSources: monthlyRevenueData.revenueBySource || {}
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching dashboard data:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
    
    return () => {
      controller.abort();
    };
  }, []);

  // Cleanup refresh controller when component unmounts
  useEffect(() => {
    return () => {
      if (refreshController) {
        refreshController.abort();
      }
    };
  }, [refreshController]);

  const handleRefreshOrders = async () => {
    // Cancel previous refresh if still running
    if (refreshController) {
      refreshController.abort();
    }
    
    const newController = new AbortController();
    setRefreshController(newController);
    
    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        signal: newController.signal
      });
      const data = await response.json();
      
      // Filter orders to show only today's orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = (data.data || []).filter(order => {
        const orderDate = new Date(order.createdAt);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
      
      setOrders(todayOrders);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error refreshing orders:', error);
      }
    } finally {
      setRefreshController(null);
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
        monthlyRevenueSummary={monthlyRevenueSummary}
        operations={operations}
        onRefreshOrders={handleRefreshOrders}
        onViewOrder={handleViewOrder}
        isLoading={isLoading}
        staffData={staffData}
        monthlyExpenses={monthlyExpenses}
        revenueData={revenueData}
      />
    </div>
  );
};

export default DashboardMinimal;
