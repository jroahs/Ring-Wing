import React from 'react';
import { Modal } from './ui';
import { FiCheckCircle, FiClock, FiArrowRight } from 'react-icons/fi';
import PendingOrder from './PendingOrder';
import TipsSection from './TipsSection';

const PendingOrdersModal = ({ isOpen, onClose, pendingOrders, processPayment, theme, customerName = '' }) => {
  // Tips for pending orders
  const pendingOrdersTips = [
    "Click on an order to expand it and process the payment",
    "Cash orders require entering the amount received from the customer",
    "Orders automatically disappear from this list after being processed"
  ];
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="wide" preventClose={false}>
      <div className="relative">
        {/* Using the reusable TipsSection with header */}
        <TipsSection 
          tips={pendingOrdersTips}
          accentColor="blue"
          title="Pending Orders Tips:"
          withHeader={true}
          headerTitle="Pending Orders"
          defaultOpen={false}
        />

        {/* Main Content Area */}
        <div className="py-4">
          {/* Current Pending Orders Stats */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl p-0.5 shadow-lg">
              <div className="bg-white rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Pending Orders Status</h3>
                <div className="flex items-center">
                  <div className="bg-blue-100 rounded-full p-2 mr-4">
                    <FiClock size={24} className="text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <div className="text-3xl font-bold text-blue-600">
                      {pendingOrders.length} {pendingOrders.length === 1 ? 'Order' : 'Orders'}
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-400 to-blue-500"
                        style={{ width: `${Math.min(100, (pendingOrders.length / 10) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* List of Pending Orders */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1">
            {pendingOrders.length === 0 ? (
              <div className="p-8 text-center">
                <FiCheckCircle size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No pending orders</p>
                <p className="text-gray-400 text-sm mt-1">All orders have been processed</p>
              </div>
            ) : (              pendingOrders.map(order => (
                <PendingOrder
                  key={order._id}
                  order={order}
                  processPayment={processPayment}
                  colors={theme.colors}
                  customerName={customerName}
                />
              ))
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg shadow-md font-medium flex items-center group"
              style={{
                backgroundColor: theme.colors.accent || '#3b82f6',
                color: 'white'
              }}
            >
              Close
              <FiArrowRight className="ml-1 group-hover:translate-x-1 transition-transform" />            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PendingOrdersModal;
