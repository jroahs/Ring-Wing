import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer } from 'recharts';
import { FiClock, FiUsers, FiDollarSign, FiCoffee, FiList, FiBox } from 'react-icons/fi';

function Dashboard() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [expenses, setExpenses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [staff, setStaff] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [staffLoading, setStaffLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(null);
  const [staffError, setStaffError] = useState(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pageMargin = useMemo(() => {
    if (windowWidth >= 1920) return '8rem';
    if (windowWidth >= 768) return '5rem';
    return '0';
  }, [windowWidth]);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const response = await fetch('/api/expenses');
        const data = await response.json();
        setExpenses(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching expenses:', error);
      }
    };
    fetchExpenses();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/orders');
        if (!response.ok) throw new Error('Failed to fetch orders');
        const { data, success } = await response.json();
        
        if (!success || !Array.isArray(data)) {
          throw new Error('Invalid server response format');
        }

        setOrders(data.map(order => ({
          ...order,
          id: order._id,
          createdAt: new Date(order.createdAt),
          updatedAt: order.updatedAt ? new Date(order.updatedAt) : null,
          completedAt: order.completedAt ? new Date(order.completedAt) : null
        })));
      } catch (err) {
        setOrdersError(err.message);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch('/api/staff');
        const data = await response.json();
        setStaff(data.map(staff => ({ ...staff, id: staff._id })));
      } catch (error) {
        setStaffError(error.message);
      } finally {
        setStaffLoading(false);
      }
    };
    fetchStaff();
  }, []);

  const orderStatusCounts = useMemo(() => {
    const counts = { received: 0, preparing: 0, ready: 0, completed: 0 };
    orders.forEach(order => counts[order.status]++);
    return counts;
  }, [orders]);

  const activeStaffCount = useMemo(() => 
    staff.filter(member => member.status === 'Active').length,
    [staff]
  );

  const recentOrders = useMemo(() => 
    orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
    [orders]
  );

  const recentStaff = useMemo(() => 
    staff.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    [staff]
  );

  const disbursedExpenses = useMemo(() => 
    expenses.filter(exp => exp.disbursed), 
    [expenses]
  );

  const formatPHP = (value) => 
    new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      maximumFractionDigits: 0
    }).format(value);

  const monthlyDisbursements = useMemo(() => {
    const monthly = disbursedExpenses.reduce((acc, exp) => {
      const date = new Date(exp.date);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      acc[monthYear] = (acc[monthYear] || 0) + Math.round(exp.amount);
      return acc;
    }, {});

    return Object.entries(monthly).map(([monthYear, amount]) => ({
      monthYear,
      amount,
      formattedMonth: new Date(monthYear + '-01').toLocaleDateString('en-PH', {
        month: 'long', 
        year: 'numeric'
      })
    })).sort((a, b) => new Date(a.monthYear) - new Date(b.monthYear));
  }, [disbursedExpenses]);

  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b',
    activeBg: '#f1670f20'
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
      <div className="flex-1 flex flex-col" style={{ marginLeft: pageMargin, transition: 'margin 0.3s' }}>
        <main className="flex-1 p-4 sm:p-6" style={{ color: colors.primary }}>
          <h2 className="text-xl lg:text-2xl font-bold mb-4">Operations Overview</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
            {[
              { 
                title: "Pending Orders", 
                value: orderStatusCounts.received,
                icon: <FiClock className="text-lg sm:text-xl" />,
                color: colors.accent
              },
              { 
                title: "Active Staff", 
                value: activeStaffCount,
                icon: <FiUsers className="text-lg sm:text-xl" />,
                color: colors.secondary
              },
              { 
                title: "Monthly Disbursements", 
                value: `₱${disbursedExpenses
                  .reduce((sum, exp) => sum + Math.round(exp.amount), 0)
                  .toLocaleString('en-PH', { maximumFractionDigits: 0 })}`, 
                icon: <FiDollarSign className="text-lg sm:text-xl" />,
                color: colors.primary
              },
              { 
                title: "Low Stock Items", 
                value: '3',
                icon: <FiBox className="text-lg sm:text-xl" />,
                color: colors.accent
              }
            ].map((metric, index) => (
              <div 
                key={index}
                className="p-3 sm:p-4 rounded-lg flex items-center justify-between"
                style={{ 
                  backgroundColor: colors.background,
                  border: `1px solid ${colors.muted}`,
                  minHeight: 'auto'
                }}
              >
                <div>
                  <div className="flex items-center gap-2 text-sm sm:text-base mb-1" style={{ color: colors.muted }}>
                    {metric.icon}
                    <span>{metric.title}</span>
                  </div>
                  <div 
                    className="text-xl sm:text-2xl font-semibold" 
                    style={{ color: metric.color }}
                  >
                    {metric.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 mb-6">
            <div className="lg:col-span-1 p-4 rounded-lg" style={{ border: `1px solid ${colors.muted}` }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <FiUsers /> Team Overview
                </h3>
                <Link 
                  to="/employees" 
                  className="text-xs sm:text-sm hover:underline"
                  style={{ color: colors.accent }}
                >
                  View All →
                </Link>
              </div>
              
              <div className="space-y-2">
                {recentStaff.map(member => (
                  <Link 
                    key={member.id}
                    to={`/employees/${member.id}`}
                    className="flex items-center gap-3 p-2 rounded hover:bg-[#f1670f10] transition-colors"
                  >
                    <div 
                      className="w-8 h-8 rounded-sm border bg-cover bg-center"
                      style={{ 
                        backgroundImage: `url(${member.profilePicture || 'https://via.placeholder.com/150'})`,
                        borderColor: colors.muted
                      }}
                    />
                    <div className="flex-1 truncate">
                      <div className="text-sm font-medium truncate">{member.name}</div>
                      <div className="text-xs truncate" style={{ color: colors.muted }}>{member.position}</div>
                    </div>
                    <span 
                      className="text-xs px-1.5 py-0.5 rounded-full capitalize"
                      style={{ 
                        backgroundColor: member.status === 'Active' ? colors.activeBg : '#f0f0f0',
                        color: member.status === 'Active' ? colors.accent : colors.muted
                      }}
                    >
                      {member.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 p-4 rounded-lg" style={{ border: `1px solid ${colors.muted}` }}>
              <h3 className="font-semibold text-sm sm:text-base mb-3 flex items-center gap-2">
                <FiDollarSign /> Monthly Disbursements
              </h3>
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyDisbursements}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.muted} />
                    <XAxis
                      dataKey="formattedMonth"
                      stroke={colors.primary}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      stroke={colors.primary}
                      tickFormatter={value => `₱${value.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`}
                      width={90}
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: colors.background,
                        border: `1px solid ${colors.muted}`,
                        fontSize: 14
                      }}
                      formatter={(value) => [
                        `₱${Number(value).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
                      ]}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill={colors.secondary}
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            <div className="lg:col-span-2 p-4 rounded-lg" style={{ border: `1px solid ${colors.muted}` }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <FiList /> Recent Orders
                </h3>
                <Link 
                  to="/orders"
                  className="text-xs sm:text-sm hover:underline"
                  style={{ color: colors.accent }}
                >
                  View All →
                </Link>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ color: colors.muted }}>
                      <th className="text-left py-2 px-3 text-xs sm:text-sm">Order #</th>
                      <th className="text-left py-2 px-3 text-xs sm:text-sm">Items</th>
                      <th className="text-right py-2 px-3 text-xs sm:text-sm">Total</th>
                      <th className="text-right py-2 px-3 text-xs sm:text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(order => (
                      <tr key={order.id} className="hover:bg-[#f1670f10]">
                        <td className="py-2 px-3 text-sm sm:text-base">
                          <Link 
                            to={`/orders/${order.id}`}
                            className="hover:underline"
                            style={{ color: colors.primary }}
                          >
                            #{order.receiptNumber}
                          </Link>
                        </td>
                        <td className="py-2 px-3 text-sm text-nowrap">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <span key={idx} className="mr-1.5">
                              {item.quantity}x {item.name}
                              {idx === 0 && order.items.length > 1 && ','}
                            </span>
                          ))}
                          {order.items.length > 2 && '...'}
                        </td>
                        <td className="py-2 px-3 text-right text-sm sm:text-base">
                          {formatPHP(order.totals.total)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span 
                            className="text-xs px-2 py-1 rounded-full capitalize"
                            style={{
                              backgroundColor: 
                                order.status === 'received' ? '#f1670f30' :
                                order.status === 'preparing' ? '#f1670f50' :
                                '#f1670f',
                              color: 
                                order.status === 'completed' ? colors.background : colors.secondary
                            }}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 rounded-lg" style={{ border: `1px solid ${colors.muted}` }}>
              <h3 className="font-semibold text-sm sm:text-base mb-3 flex items-center gap-2">
                <FiCoffee /> Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'New Order', icon: <FiCoffee />, path: '/new-order' },
                  { label: 'Inventory', icon: <FiBox />, path: '/inventory' },
                  { label: 'Reports', icon: <FiDollarSign />, path: '/reports' },
                  { label: 'Add Employee', icon: <FiUsers />, path: '/employees/new' }
                ].map((action, index) => (
                  <Link
                    key={index}
                    to={action.path}
                    className="flex items-center gap-2 p-2.5 text-sm rounded-md transition-all hover:opacity-90"
                    style={{ 
                      backgroundColor: colors.activeBg,
                      color: colors.primary
                    }}
                  >
                    <span style={{ color: colors.accent }}>{action.icon}</span>
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;