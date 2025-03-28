import { useEffect, useState } from 'react';
import { FiClock, FiCheck } from 'react-icons/fi';

const KitchenDisplay = ({ orders }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const calculateTimeElapsed = (orderDate) => {
    const diff = now - new Date(orderDate);
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  };

  return (
    <div className={`fixed bottom-0 left-64 right-0 bg-white border-t shadow-lg transition-all ${
      isExpanded ? 'h-64' : 'h-12'
    }`}>
      <div 
        className="flex justify-between items-center p-2 bg-gray-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-bold">Kitchen Display System</h3>
        <span>{orders.length} active orders</span>
      </div>

      {isExpanded && (
        <div className="p-4 h-[calc(100%-3rem)] overflow-y-auto">
          {orders.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No active orders</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map(order => (
                <div key={order.id} className="border rounded p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold">Order #{order.id}</h4>
                      <p className="text-sm text-gray-600 flex items-center">
                        <FiClock className="mr-1" />
                        {calculateTimeElapsed(order.createdAt)}
                      </p>
                      <p className="text-sm capitalize">{order.orderType}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      order.status === 'received' ? 'bg-red-100 text-red-800' :
                      order.status === 'preparing' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <ul className="mt-2 space-y-1">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="text-sm">
                        {item.quantity}x {item.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;