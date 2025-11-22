import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../contexts/CustomerAuthContext';
import { useCustomerOrders } from '../../hooks/useCustomerOrders';
import './MyOrders.css';

const MyOrders = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const { orders, isLoading, error, fetchOrders, pagination } = useCustomerOrders();
  const [activeTab, setActiveTab] = useState('current');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/customer/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Fetch orders on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const currentOrders = orders.filter(order => 
    ['pending_payment', 'payment_verified', 'preparing', 'ready'].includes(order.status)
  );

  const pastOrders = orders.filter(order => 
    ['completed', 'cancelled'].includes(order.status)
  );

  const getStatusColor = (status) => {
    const colors = {
      pending_payment: '#f59e0b',
      payment_verified: '#3b82f6',
      preparing: '#3b82f6',
      ready: '#10b981',
      completed: '#6b7280',
      cancelled: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending_payment: 'Pending Payment',
      payment_verified: 'Payment Verified',
      preparing: 'Preparing',
      ready: 'Ready for Pickup',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetails = (orderId) => {
    navigate(`/customer/orders/${orderId}`);
  };

  const handleBackToCheckout = () => {
    navigate('/self-checkout');
  };

  if (authLoading) {
    return (
      <div className="my-orders-page loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="my-orders-page">
      <div className="orders-container">
        <div className="orders-header">
          <button className="back-btn" onClick={handleBackToCheckout}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Menu
          </button>
          <h1>My Orders</h1>
        </div>

        {/* Tabs */}
        <div className="orders-tabs">
          <button
            className={`tab ${activeTab === 'current' ? 'active' : ''}`}
            onClick={() => setActiveTab('current')}
          >
            Current Orders ({currentOrders.length})
          </button>
          <button
            className={`tab ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past Orders ({pastOrders.length})
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="orders-loading">
            <div className="spinner"></div>
            <p>Loading orders...</p>
          </div>
        )}

        {/* Current Orders Tab */}
        {!isLoading && activeTab === 'current' && (
          <div className="orders-list">
            {currentOrders.length === 0 ? (
              <div className="empty-state">
                <svg width="80" height="80" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                </svg>
                <h3>No Current Orders</h3>
                <p>You don't have any orders in progress</p>
                <button className="browse-menu-btn" onClick={handleBackToCheckout}>
                  Browse Menu
                </button>
              </div>
            ) : (
              currentOrders.map((order) => (
                <div key={order._id} className="order-card">
                  <div className="order-card-header">
                    <div className="order-number">
                      <strong>Order #{order.orderNumber}</strong>
                      <span className="order-date">{formatDate(order.createdAt)}</span>
                    </div>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="order-card-body">
                    <div className="order-items-summary">
                      <strong>{order.items?.length || 0} items</strong>
                      {order.items && order.items.slice(0, 2).map((item, idx) => (
                        <p key={idx}>{item.quantity}x {item.name}</p>
                      ))}
                      {order.items && order.items.length > 2 && (
                        <p className="more-items">+{order.items.length - 2} more</p>
                      )}
                    </div>

                    <div className="order-fulfillment">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        {order.fulfillmentType === 'delivery' ? (
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                        ) : order.fulfillmentType === 'takeout' ? (
                          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" />
                        ) : (
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        )}
                      </svg>
                      <span>{order.fulfillmentType === 'delivery' ? 'Delivery' : order.fulfillmentType === 'takeout' ? 'Takeout' : 'Dine-in'}</span>
                    </div>
                  </div>

                  <div className="order-card-footer">
                    <div className="order-total">
                      <strong>Total: ₱{order.total?.toFixed(2)}</strong>
                    </div>
                    <button 
                      className="view-details-btn"
                      onClick={() => handleViewDetails(order._id)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Past Orders Tab */}
        {!isLoading && activeTab === 'past' && (
          <div className="orders-list">
            {pastOrders.length === 0 ? (
              <div className="empty-state">
                <svg width="80" height="80" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <h3>No Past Orders</h3>
                <p>Your order history will appear here</p>
                <button className="browse-menu-btn" onClick={handleBackToCheckout}>
                  Browse Menu
                </button>
              </div>
            ) : (
              pastOrders.map((order) => (
                <div key={order._id} className="order-card">
                  <div className="order-card-header">
                    <div className="order-number">
                      <strong>Order #{order.orderNumber}</strong>
                      <span className="order-date">{formatDate(order.createdAt)}</span>
                    </div>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="order-card-body">
                    <div className="order-items-summary">
                      <strong>{order.items?.length || 0} items</strong>
                      {order.items && order.items.slice(0, 2).map((item, idx) => (
                        <p key={idx}>{item.quantity}x {item.name}</p>
                      ))}
                      {order.items && order.items.length > 2 && (
                        <p className="more-items">+{order.items.length - 2} more</p>
                      )}
                    </div>

                    <div className="order-fulfillment">
                      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                        {order.fulfillmentType === 'delivery' ? (
                          <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                        ) : order.fulfillmentType === 'takeout' ? (
                          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" />
                        ) : (
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        )}
                      </svg>
                      <span>{order.fulfillmentType === 'delivery' ? 'Delivery' : order.fulfillmentType === 'takeout' ? 'Takeout' : 'Dine-in'}</span>
                    </div>
                  </div>

                  <div className="order-card-footer">
                    <div className="order-total">
                      <strong>Total: ₱{order.total?.toFixed(2)}</strong>
                    </div>
                    <button 
                      className="view-details-btn"
                      onClick={() => handleViewDetails(order._id)}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;
