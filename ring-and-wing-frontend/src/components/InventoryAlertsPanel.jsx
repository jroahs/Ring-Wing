import React, { useState, useEffect, useCallback } from 'react';
import { 
  AlertTriangle, 
  Package, 
  Clock, 
  TrendingDown, 
  X, 
  RefreshCw, 
  Bell,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Timer
} from 'lucide-react';

/**
 * Real-time Inventory Alerts Dashboard
 * Shows low stock, out-of-stock, expiring reservations, and availability issues
 */
const InventoryAlertsPanel = ({ className = "", isExpanded = false, onToggle }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  // Alert types configuration
  const alertTypes = {
    low_stock: {
      label: 'Low Stock',
      icon: TrendingDown,
      color: 'yellow',
      priority: 2
    },
    out_of_stock: {
      label: 'Out of Stock',
      icon: Package,
      color: 'red',
      priority: 1
    },
    expiring_reservation: {
      label: 'Expiring Reservation',
      icon: Clock,
      color: 'orange',
      priority: 2
    },
    menu_unavailable: {
      label: 'Menu Item Unavailable',
      icon: AlertCircle,
      color: 'red',
      priority: 1
    },
    availability_check_failed: {
      label: 'Availability Check Failed',
      icon: X,
      color: 'gray',
      priority: 3
    }
  };

  /**
   * Fetch alerts from multiple endpoints
   */
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch different types of alerts in parallel
      const [
        lowStockResponse,
        reservationsResponse,
        availabilityResponse
      ] = await Promise.all([
        fetch('/api/items?lowStock=true&active=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/ingredients/reservations?expiringSoon=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/ingredients/availability/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const alertsArray = [];

      // Process low stock alerts
      if (lowStockResponse.ok) {
        const lowStockData = await lowStockResponse.json();
        const lowStockItems = lowStockData.data || lowStockData || [];
        
        lowStockItems.forEach(item => {
          const alertType = item.currentStock === 0 ? 'out_of_stock' : 'low_stock';
          alertsArray.push({
            id: `${alertType}_${item._id}`,
            type: alertType,
            title: `${item.name}`,
            message: item.currentStock === 0 
              ? 'Completely out of stock' 
              : `Only ${item.currentStock} ${item.unit} remaining`,
            details: {
              itemId: item._id,
              currentStock: item.currentStock,
              minStock: item.minStock,
              unit: item.unit,
              category: item.category
            },
            timestamp: new Date().toISOString(),
            severity: item.currentStock === 0 ? 'high' : 'medium'
          });
        });
      }

      // Process expiring reservations
      if (reservationsResponse.ok) {
        const reservationsData = await reservationsResponse.json();
        const expiringReservations = reservationsData.data || [];
        
        expiringReservations.forEach(reservation => {
          const minutesLeft = Math.floor((new Date(reservation.expiresAt) - new Date()) / 60000);
          alertsArray.push({
            id: `expiring_reservation_${reservation._id}`,
            type: 'expiring_reservation',
            title: `Reservation #${reservation.orderId}`,
            message: `Expires in ${minutesLeft} minutes`,
            details: {
              reservationId: reservation._id,
              orderId: reservation.orderId,
              expiresAt: reservation.expiresAt,
              items: reservation.reservedItems
            },
            timestamp: reservation.createdAt,
            severity: minutesLeft < 5 ? 'high' : 'medium'
          });
        });
      }

      // Process availability issues
      if (availabilityResponse.ok) {
        const availabilityData = await availabilityResponse.json();
        const issues = availabilityData.data?.issues || [];
        
        issues.forEach(issue => {
          alertsArray.push({
            id: `menu_unavailable_${issue.menuItemId}`,
            type: 'menu_unavailable',
            title: issue.menuItemName,
            message: issue.reason || 'Required ingredients unavailable',
            details: {
              menuItemId: issue.menuItemId,
              missingIngredients: issue.missingIngredients,
              affectedOrders: issue.affectedOrders
            },
            timestamp: issue.detectedAt,
            severity: 'high'
          });
        });
      }

      // Sort by priority and timestamp
      alertsArray.sort((a, b) => {
        const priorityA = alertTypes[a.type]?.priority || 3;
        const priorityB = alertTypes[b.type]?.priority || 3;
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB; // Lower number = higher priority
        }
        
        return new Date(b.timestamp) - new Date(a.timestamp); // Most recent first
      });

      setAlerts(alertsArray);
      setLastRefresh(Date.now());

    } catch (error) {
      console.error('Error fetching inventory alerts:', error);
      // Add error alert
      setAlerts(prev => [
        {
          id: 'fetch_error',
          type: 'availability_check_failed',
          title: 'Alert System Error',
          message: 'Failed to fetch latest alerts',
          timestamp: new Date().toISOString(),
          severity: 'low'
        },
        ...prev
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh alerts with smart caching (reduced frequency)
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 120000); // Increased from 30s to 2 minutes
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const dismissAlert = (alertId) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const undismissAlert = (alertId) => {
    setDismissedAlerts(prev => {
      const newSet = new Set(prev);
      newSet.delete(alertId);
      return newSet;
    });
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'active') return !dismissedAlerts.has(alert.id);
    if (filter === 'dismissed') return dismissedAlerts.has(alert.id);
    if (filter === 'high') return alert.severity === 'high';
    return true;
  });

  const getAlertColor = (type, dismissed = false) => {
    if (dismissed) return 'bg-gray-100 border-gray-300 text-gray-600';
    
    const colors = {
      yellow: 'bg-yellow-50 border-yellow-300 text-yellow-800',
      red: 'bg-red-50 border-red-300 text-red-800',
      orange: 'bg-orange-50 border-orange-300 text-orange-800',
      gray: 'bg-gray-50 border-gray-300 text-gray-800'
    };
    
    return colors[alertTypes[type]?.color] || colors.gray;
  };

  const formatTimeAgo = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isExpanded) {
    const activeAlertCount = alerts.filter(alert => !dismissedAlerts.has(alert.id)).length;
    const highPriorityCount = alerts.filter(alert => 
      alert.severity === 'high' && !dismissedAlerts.has(alert.id)
    ).length;

    return (
      <button
        onClick={onToggle}
        className={`relative p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow ${className}`}
        title="Inventory Alerts"
      >
        <Bell className={`w-6 h-6 ${activeAlertCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
        {activeAlertCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeAlertCount > 9 ? '9+' : activeAlertCount}
          </span>
        )}
        {highPriorityCount > 0 && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </button>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Inventory Alerts</h3>
            {filteredAlerts.length > 0 && (
              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
                {filteredAlerts.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchAlerts}
              disabled={loading}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              title="Refresh alerts"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={onToggle}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 flex space-x-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'high', label: 'High Priority' },
            { key: 'dismissed', label: 'Dismissed' }
          ].map(filterOption => (
            <button
              key={filterOption.key}
              onClick={() => setFilter(filterOption.key)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === filterOption.key
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="max-h-96 overflow-y-auto">
        {loading && alerts.length === 0 ? (
          <div className="p-4 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">Loading alerts...</p>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-gray-600">
              {filter === 'all' ? 'No alerts at this time' : 
               filter === 'dismissed' ? 'No dismissed alerts' :
               'No active alerts'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAlerts.map(alert => {
              const alertType = alertTypes[alert.type];
              const Icon = alertType?.icon || AlertTriangle;
              const isDismissed = dismissedAlerts.has(alert.id);
              
              return (
                <div
                  key={alert.id}
                  className={`p-4 border-l-4 ${getAlertColor(alert.type, isDismissed)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium truncate">{alert.title}</h4>
                          {alert.severity === 'high' && !isDismissed && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                              High Priority
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm mt-1">{alert.message}</p>
                        
                        <div className="flex items-center space-x-4 mt-2 text-xs opacity-75">
                          <span>{alertType?.label}</span>
                          <span>{formatTimeAgo(alert.timestamp)}</span>
                        </div>

                        {/* Additional Details */}
                        {alert.details && (
                          <div className="mt-2 text-xs space-y-1">
                            {alert.type === 'low_stock' || alert.type === 'out_of_stock' ? (
                              <div className="flex items-center space-x-4">
                                <span>Current: {alert.details.currentStock} {alert.details.unit}</span>
                                {alert.details.minStock && (
                                  <span>Min: {alert.details.minStock} {alert.details.unit}</span>
                                )}
                              </div>
                            ) : alert.type === 'expiring_reservation' ? (
                              <div>
                                Order: {alert.details.orderId} • 
                                {alert.details.items?.length || 0} items reserved
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      {isDismissed ? (
                        <button
                          onClick={() => undismissAlert(alert.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          title="Show alert"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
                          title="Dismiss alert"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Last updated: {new Date(lastRefresh).toLocaleTimeString()}
          {loading && <span> • Refreshing...</span>}
        </p>
      </div>
    </div>
  );
};

/**
 * Compact Inventory Alerts Widget
 * For embedding in other dashboards
 */
export const InventoryAlertsWidget = ({ className = "" }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <InventoryAlertsPanel 
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        className={isExpanded ? "absolute top-0 right-0 w-96 z-50" : ""}
      />
    </div>
  );
};

export default InventoryAlertsPanel;