import { useState, useEffect } from 'react';
import { FiPlus, FiClock, FiCheck, FiTruck, FiHome, FiShoppingBag } from 'react-icons/fi';
import OrderModal from './OrderModal';
import KitchenDisplay from './KitchenDisplay';

const OrderSystem = () => {
  const [orders, setOrders] = useState([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderType, setSelectedOrderType] = useState('dine-in');
  const [activeTab, setActiveTab] = useState('all');
  const [analytics, setAnalytics] = useState({
    todaySales: 0,
    avgPrepTime: 0,
    popularItems: []
  });

  const menuItems = [
    {
      id: 1,
      name: "Arabica Coffee",
      category: "Beverage",
      price: 4.50,
      modifiers: [
        { name: "Size", options: ["Small", "Medium", "Large"], priceDiff: [0, 0.5, 1] },
        { name: "Milk", options: ["Whole", "Skim", "Almond"], priceDiff: [0, 0, 0.5] }
      ],
      image: "/coffee.jpg"
    },
    {
      id: 2,
      name: "Avocado Toast",
      category: "Food",
      price: 8.75,
      modifiers: [
        { name: "Add-ons", options: ["Egg", "Bacon", "Cheese"], priceDiff: [1.5, 2, 1] }
      ],
      image: "/toast.jpg"
    }
  ];

  // Order status management
  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(orders.map(order => 
      order.id === orderId ? { 
        ...order, 
        status: newStatus, 
        updatedAt: new Date(),
        ...(newStatus === 'completed' && { completedAt: new Date() })
      } : order
    ));
  };

  // Add new order handler
  const addNewOrder = (order) => {
    const newOrder = {
      ...order,
      id: orders.length + 1,
      createdAt: new Date(),
      status: 'received',
      orderType: selectedOrderType
    };
    setOrders([...orders, newOrder]);
  };

  // Analytics calculation
  useEffect(() => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const todaySales = completedOrders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.price, 0), 0);
    
    const avgPrepTime = orders.length > 0 ? 
      orders.reduce((sum, order) => 
        sum + ((order.completedAt || new Date()) - order.createdAt), 0) / orders.length : 0;

    const popularItems = [...menuItems]
      .sort((a, b) => 
        orders.reduce((countA, order) => 
          countA + order.items.filter(i => i.id === a.id).length, 0) -
        orders.reduce((countB, order) => 
          countB + order.items.filter(i => i.id === b.id).length, 0))
      .slice(0, 3);

    setAnalytics({ todaySales, avgPrepTime, popularItems });
  }, [orders]);

  // Filter orders based on active tab
  const filteredOrders = orders.filter(order => 
    activeTab === 'all' || order.status === activeTab
  );

  // Helper: Format a value as Philippine Peso
  const formatPeso = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="md:ml-64 h-full flex flex-col">
      {/* Order Header Section */}
      <header className="bg-[#2e0304] text-white p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Order Management</h1>
            <div className="flex flex-wrap gap-2">
              {['dine-in', 'take-out', 'delivery'].map(type => (
                <button
                  key={type}
                  className={`px-4 py-2 rounded transition-colors ${
                    selectedOrderType === type 
                      ? 'bg-[#f1670f]' 
                      : 'bg-[#853619] hover:bg-[#f1670f30]'
                  }`}
                  onClick={() => setSelectedOrderType(type)}
                >
                  {type.split('-').join(' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="bg-[#853619] p-3 rounded">
              <p className="text-sm">
                Today's Sales: <span className="font-bold">{formatPeso(analytics.todaySales)}</span>
              </p>
              <p className="text-sm">
                Avg. Prep Time: <span className="font-bold">{Math.floor(analytics.avgPrepTime / 60000)} mins</span>
              </p>
            </div>
            <button 
              className="px-4 py-2 bg-[#f1670f] rounded hover:bg-[#f1670f90] transition-colors flex items-center"
              onClick={() => setShowOrderModal(true)}
            >
              <FiPlus className="mr-2" />
              New Order
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-7xl mx-auto">
          {/* Order Status Tabs */}
          <nav className="sticky top-0 bg-white border-b z-10">
            <div className="flex">
              {['all', 'received', 'preparing', 'ready', 'completed'].map(tab => (
                <button
                  key={tab}
                  className={`py-3 px-6 font-medium transition-colors ${
                    activeTab === tab 
                      ? 'border-b-2 border-[#f1670f] text-[#f1670f]' 
                      : 'text-gray-600 hover:text-[#853619]'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </nav>

          {/* Orders Grid */}
          <section className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map(order => (
                <article 
                  key={order.id} 
                  className="bg-white rounded-lg shadow-md overflow-hidden border border-[#ac9c9b]"
                >
                  <div className={`p-3 ${
                    order.status === 'received' ? 'bg-[#f8d7da]' :
                    order.status === 'preparing' ? 'bg-[#fff3cd]' :
                    order.status === 'ready' ? 'bg-[#e9f7ef]' :
                    'bg-gray-100'
                  }`}>
                    <div className="flex justify-between items-center">
                      <h2 className="font-bold">Order #{order.id}</h2>
                      <time className="text-sm">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </time>
                    </div>
                    <p className="capitalize text-sm text-gray-600">{order.orderType}</p>
                  </div>

                  <div className="p-3">
                    <ul className="mb-3 space-y-1">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>{item.quantity}x {item.name}</span>
                          <span>{formatPeso(item.price)}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="flex justify-between border-t pt-2">
                      <strong>Total:</strong>
                      <strong>
                        {formatPeso(order.items.reduce((sum, item) => sum + item.price, 0))}
                      </strong>
                    </div>

                    {order.status !== 'completed' && (
                      <div className="mt-3 flex gap-2 flex-wrap">
                        {['preparing', 'ready', 'completed'].map(status => (
                          <button
                            key={status}
                            className={`text-xs py-1 px-2 rounded transition-colors ${
                              order.status === status 
                                ? 'bg-[#f1670f] text-white' 
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            onClick={() => updateOrderStatus(order.id, status)}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <KitchenDisplay orders={orders.filter(o => o.status !== 'completed')} />
        </div>
      </main>

      {/* Order Modal */}
      {showOrderModal && (
        <OrderModal 
          menuItems={menuItems}
          onClose={() => setShowOrderModal(false)}
          onSubmit={addNewOrder}
          orderType={selectedOrderType}
        />
      )}
    </div>
  );
};

export default OrderSystem;
