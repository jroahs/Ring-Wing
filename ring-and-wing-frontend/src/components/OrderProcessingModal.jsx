import React from 'react';
import { Modal } from './ui';
import { FiClock, FiCheckCircle, FiArrowRight, FiCoffee } from 'react-icons/fi';
import TipsSection from './TipsSection';

const OrderProcessingModal = ({ isOpen, onClose, orders, updateOrderStatus, theme }) => {
  // Tips for order processing
  const orderProcessingTips = [
    "Orders in any status can be marked as 'Completed' once they are served",
    "This view shows all order statuses (received, preparing, ready, etc.)",
    "Completed orders are automatically removed from this view to avoid clutter"
  ];
  
  // Format currency to PHP
  const formatPHP = (value) => 
    new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP', 
      minimumFractionDigits: 2 
    }).format(value);  // Filter orders to match the main component's functionality
  // We want to show orders that are being processed (but not pending or completed)
  // Pending orders need to be processed by POS first (payment needs to be collected)
  const processedOrders = orders.filter(order => 
    order.status !== 'completed' && 
    order.paymentMethod !== 'pending' &&
    order.status !== 'pending'
  );
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="wide" preventClose={false}>
      <div className="relative">        {/* Using the reusable TipsSection with header */}
        <TipsSection 
          tips={orderProcessingTips}
          accentColor="orange"
          title="Order Completion Tips:"
          withHeader={true}
          headerTitle="Process Ready Orders"
          defaultOpen={false}
        />

        {/* Main Content Area */}
        <div className="py-4">        {/* Processed Orders Stats */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl p-0.5 shadow-lg">
              <div className="bg-white rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Active Orders</h3>
                <div className="flex items-center">
                  <div className="bg-orange-100 rounded-full p-2 mr-4">
                    <FiCoffee size={24} className="text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-bold text-orange-600">
                      {processedOrders.length} {processedOrders.length === 1 ? 'Order' : 'Orders'}
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-500"
                        style={{ width: `${Math.min(100, (processedOrders.length / 10) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>          {/* List of Orders Ready for Completion */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
            {processedOrders.length === 0 ? (
              <div className="p-8 text-center">
                <FiCheckCircle size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No orders ready for completion</p>
                <p className="text-gray-400 text-sm mt-1">All processed orders have been completed</p>
              </div>
            ) : (
              processedOrders.map(order => (
                <div 
                  key={order._id || order.id} 
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all mb-4"
                >
                  <div className={`p-4 border-l-4 ${
                    order.status === 'received' ? 'border-[#f1670f30]' :
                    order.status === 'preparing' ? 'border-[#f1670f50]' :
                    order.status === 'ready' ? 'border-[#f1670f]' :
                    'border-transparent'
                  }`}>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex flex-col">
                        <h2 className="font-bold text-lg">
                          Order #{order.receiptNumber || order._id?.substring(0, 6)}
                        </h2>
                        <span className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>                      <span className={`text-sm px-3 py-1 rounded-full ${
                        order.status === 'ready' 
                          ? 'bg-orange-100 text-orange-700' 
                          : order.status === 'preparing'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <div>
                            <span className="font-medium">{item.quantity}x </span>
                            <span>{item.name}</span>
                            {item.selectedSize && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({item.selectedSize})
                              </span>
                            )}
                          </div>
                          <span>{formatPHP(item.price)}</span>
                        </div>
                      ))}
                      
                      <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center font-bold">
                        <span>Total:</span>
                        <span>{formatPHP(order.totals?.total || 0)}</span>
                      </div>
                    </div>
                      <div className="mt-4 flex gap-2 flex-wrap">                      <button
                        className="w-full text-base px-4 py-2 rounded-full transition-colors bg-orange-500 text-white hover:bg-orange-600"
                        onClick={() => {
                          // Call the updateOrderStatus function to mark the order as completed
                          // This will update the UI and database status
                          updateOrderStatus(order._id || order.id, 'completed');
                        }}
                      >
                        Mark as Completed
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg shadow-md font-medium flex items-center group"
              style={{
                backgroundColor: theme.colors.accent || '#f97316',
                color: 'white'
              }}
            >
              Close
              <FiArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default OrderProcessingModal;
