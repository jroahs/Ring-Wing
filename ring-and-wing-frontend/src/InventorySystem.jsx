import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, PieChart, Bar, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { saveAs } from 'file-saver';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { API_URL } from './App';  // Import API_URL from App.jsx
import { Button } from './components/ui/Button'; // Import Button component
import { LoadingSpinner } from './components/ui';
import { Modal } from './components/ui/Modal'; // Extended UI Modal
import BrandedLoadingScreen from './components/ui/BrandedLoadingScreen';
import { PrintableInventoryReport } from './components/ui/PrintableInventoryReport';
import { toast } from 'react-toastify';
import { getCurrentUser, hasInventoryAccess, hasPermission } from './utils/permissions';
import { io } from 'socket.io-client'; // 🔥 NEW: Real-time socket events (Sprint 22)
import { businessDateKey } from './utils/businessDate';
import { 
  Bell, 
  X, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  PackageOpen, 
  CalendarClock, 
  CheckCircle, 
  Trash2, 
  RefreshCw 
} from 'lucide-react';

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

// AlertCard component - modernized
const AlertCard = ({ alert, onRestock, onDispose }) => {
  const isStockAlert = alert.type === 'stock';
  const isExpired = alert.type === 'expiration' && alert.message.includes('expired');
  
  // Define styles based on alert type
  let icon, bgColor, borderColor, textColor;
  
  if (isStockAlert && alert.message.includes('out of stock')) {
    icon = <AlertTriangle className="w-5 h-5 text-red-500" />;
    bgColor = 'bg-red-50';
    borderColor = 'border-red-200';
    textColor = 'text-red-700';
  } else if (isStockAlert) {
    icon = <PackageOpen className="w-5 h-5 text-amber-500" />;
    bgColor = 'bg-amber-50';
    borderColor = 'border-amber-200';
    textColor = 'text-amber-800';
  } else if (isExpired) {
    icon = <Trash2 className="w-5 h-5 text-red-500" />;
    bgColor = 'bg-red-50';
    borderColor = 'border-red-200';
    textColor = 'text-red-700';
  } else {
    icon = <CalendarClock className="w-5 h-5 text-blue-500" />;
    bgColor = 'bg-blue-50';
    borderColor = 'border-blue-200';
    textColor = 'text-blue-700';
  }

  return (
    <div className={`border rounded-lg p-4 flex items-start gap-4 transition-all hover:shadow-md ${bgColor} ${borderColor}`}>
      <div className="flex-shrink-0 mt-1">{icon}</div>
      
      <div className="flex-grow min-w-0">
        <h4 className={`font-semibold text-sm ${textColor} mb-1`}>
          {alert.message}
        </h4>
        <div className="text-xs text-gray-500 flex items-center gap-2">
           <span>{new Date(alert.date).toLocaleDateString()}</span>
           {alert.details && <span>• {alert.details}</span>}
        </div>
      </div>

      <div className="flex-shrink-0 flex flex-col gap-2">
        {isStockAlert && (
          <Button onClick={() => onRestock(alert.id)} variant="accent" size="sm" className="w-full whitespace-nowrap">
            Restock
          </Button>
        )}
        {isExpired && (
          <Button 
            onClick={() => onDispose(alert.id.split('-')[0], alert.id.split('-')[1])} 
            variant="secondary" 
            size="sm"
            className="w-full whitespace-nowrap bg-white border border-red-200 text-red-600 hover:bg-red-50"
          >
            Dispose
          </Button>
        )}
      </div>
    </div>
  );
};

// AlertDashboard component - remodelled with Modal and Pagination
const AlertDashboard = ({ alerts, onRestock, onDispose }) => {
  const [isOpen, setIsOpen] = useState(false); // Modal state
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // Show 6 items per page

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, search]);

  const alertCounts = {
    all: alerts.length,
    stock: alerts.filter(a => a.type === 'stock').length,
    expiration: alerts.filter(a => a.type === 'expiration').length
  };

  // Filter Logic
  const filteredAlerts = alerts
    .filter(alert => {
      // Type Filter
      if (filterType !== 'all' && alert.type !== filterType) return false;
      // Search Filter
      if (search && !alert.message.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      // Priority sorting
       const getPriority = (alert) => {
        if (alert.type === 'stock' && alert.message.includes('out of stock')) return 1;
        if (alert.type === 'expiration' && alert.message.includes('expired')) return 2;
        if (alert.type === 'stock') return 3;
        return 4; 
      };
      return getPriority(a) - getPriority(b);
    });

  // Pagination Logic
  const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
  const paginatedAlerts = filteredAlerts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Trigger Button (The summary bar in the dashboard)
  if (!isOpen) {
    return (
      <div 
        className="flex items-center justify-between px-3 py-2 border rounded shadow-sm bg-white cursor-pointer hover:shadow-md transition-all gap-4 select-none min-w-[300px]"
        style={{ borderColor: colors.muted }}
        onClick={() => setIsOpen(true)}
      >
          <div className="flex items-center gap-3">
             <div className="relative flex items-center">
               <Bell className="w-5 h-5" style={{ color: colors.primary }} />
               {alerts.length > 0 && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span>}
             </div>
             <span className="font-medium text-sm" style={{ color: colors.primary }}>Inventory Alerts</span>
          </div>
          
          <div className="flex items-center gap-2">
            {alertCounts.stock > 0 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  <PackageOpen className="w-3 h-3" /> <span>{alertCounts.stock}</span>
                </div>
            )}
            {alertCounts.expiration > 0 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <CalendarClock className="w-3 h-3" /> <span>{alertCounts.expiration}</span>
                </div>
            )}
             {alerts.length === 0 && (
                <span className="text-xs text-gray-500">No alerts</span>
             )}
          </div>
      </div>
    );
  }

  // Modal View
  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 modal-overlay z-[60]" onClick={() => setIsOpen(false)} />
      
      {/* Modal Content */}
      <div className="fixed inset-0 flex items-center justify-center z-[70] pointer-events-none p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-5 border-b flex items-center justify-between bg-gray-50 rounded-t-xl">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                <Bell className="w-5 h-5 text-red-500" /> Inventory Action Center
              </h2>
              <p className="text-sm text-gray-500 mt-1">Manage stock alerts and expirations</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Controls */}
          <div className="p-4 border-b space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: 'All Alerts', count: alertCounts.all, icon: AlertTriangle },
                { id: 'stock', label: 'Stock Levels', count: alertCounts.stock, icon: PackageOpen },
                { id: 'expiration', label: 'Expirations', count: alertCounts.expiration, icon: CalendarClock },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                    ${filterType === tab.id 
                      ? 'bg-gray-900 text-white shadow-md' 
                      : 'bg-white border text-gray-600 hover:bg-gray-50'}
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${filterType === tab.id ? 'bg-white/20' : 'bg-gray-200'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Search alerts..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 min-h-[300px]">
            {filteredAlerts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                <CheckCircle className="w-12 h-12 mb-3 text-green-500 opacity-50" />
                <p>All caught up! No alerts found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedAlerts.map(alert => (
                  <AlertCard 
                    key={alert.id} 
                    alert={alert} 
                    onRestock={onRestock} 
                    onDispose={onDispose} 
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t bg-gray-50 rounded-b-xl flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Page {currentPage} of {totalPages} ({filteredAlerts.length} items)
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const InventorySystem = () => {
  
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State management
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const printableReportRef = useRef();
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    unit: 'pieces',
    cost: 0,
    price: 0,
    vendor: '',
    inventory: [],
    trackExpiration: true,
    isCountBased: true,
    minimumThreshold: 5
  });

  // Daily inventory tracking state
  const [showDailyInventoryModal, setShowDailyInventoryModal] = useState(false);
  const [selectedItemForEndDay, setSelectedItemForEndDay] = useState(null);
  const [endDayQuantities, setEndDayQuantities] = useState([]);

  // Unit conversion state
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionData, setConversionData] = useState({
    value: '',
    fromUnit: 'grams',
    toUnit: 'kilograms'
  });
  const [conversionResult, setConversionResult] = useState(null);

  // restock
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [restockData, setRestockData] = useState({
    quantity: '',
    expirationDate: '',
    cost: ''
  });

  // State for bulk end-of-day inventory
  const [showBulkEndDayModal, setShowBulkEndDayModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkEndDayQuantities, setBulkEndDayQuantities] = useState([]);

  // Add loading state for bulk operations
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);

  // New inventory features state
  const [inventoryReservations, setInventoryReservations] = useState([]);
  const [showReservationsModal, setShowReservationsModal] = useState(false);
  const [realTimeStatus, setRealTimeStatus] = useState({});
  const [costAnalysis, setCostAnalysis] = useState({});
  const [isRefreshThrottled, setIsRefreshThrottled] = useState(false);
  const lastRefreshTime = useRef(0);

  // 🔥 NEW: Socket.io for real-time inventory updates (Sprint 22)
  const [socket, setSocket] = useState(null);
  const socketInitializedRef = useRef(false);

  // PDF Download Function
  const handleDownloadInventoryPDF = async () => {
    if (!printableReportRef.current) {
      alert('Report not available. Please try again.');
      return;
    }

    try {
      const element = printableReportRef.current;
      
      // Force the element to be visible and properly sized
      const originalStyles = {
        display: element.style.display,
        position: element.style.position,
        left: element.style.left,
        top: element.style.top,
        zIndex: element.style.zIndex,
        width: element.style.width,
        height: element.style.height,
        visibility: element.style.visibility,
        opacity: element.style.opacity
      };
      
      // Make element visible and positioned properly
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.left = '-9999px'; // Move off-screen instead of z-index
      element.style.top = '0px';
      element.style.width = '800px';
      element.style.height = 'auto';
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      element.style.backgroundColor = 'white';
      
      // Force layout recalculation
      element.offsetHeight;
      
      // Wait for charts to render
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const actualHeight = element.scrollHeight;
      console.log('Capturing inventory report:', element.offsetWidth, 'x', actualHeight);
      
      // Convert HTML to canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 800,
        height: actualHeight,
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: false,
        onclone: (clonedDoc) => {
          // Ensure SVG elements render properly
          const svgElements = clonedDoc.querySelectorAll('svg');
          svgElements.forEach(svg => {
            svg.style.backgroundColor = 'white';
            svg.style.overflow = 'visible';
            
            const textElements = svg.querySelectorAll('text, tspan');
            textElements.forEach(text => {
              text.style.fill = '#000000';
              text.setAttribute('fill', '#000000');
            });
          });
        }
      });
      
      // Restore original styles
      Object.keys(originalStyles).forEach(key => {
        element.style[key] = originalStyles[key];
      });
      
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Failed to capture content.');
      }
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const imgWidth = 210; // A4 width
      const pageHeight = 297; // A4 height
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      // Add image to PDF (handle multiple pages if needed)
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Save PDF
      const fileName = `Inventory_Analytics_${businessDateKey(new Date())}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message}`);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  // Vendor creation state
  const [showVendorAccordion, setShowVendorAccordion] = useState(false);
  const [newVendor, setNewVendor] = useState({
    name: '',
    contact: { email: '', phone: '' },
    address: { street: '', city: '', state: '', zipCode: '' },
    paymentTerms: 'NET_30'
  });

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, vendorsRes, auditLogsRes] = await Promise.all([
          axios.get(`${API_URL}/api/items`),
          axios.get(`${API_URL}/api/vendors`),
          axios.get(`${API_URL}/api/inventory-audit-logs`)
        ]);
        setItems(itemsRes.data);
        setVendors(vendorsRes.data);
        
        // Load persisted audit logs
        if (auditLogsRes.data?.logs) {
          setAuditLog(auditLogsRes.data.logs);
        }
        
        // Fetch new inventory features
        await fetchInventoryReservations();
        
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err.response?.data || err.message);
        setError('Failed to fetch data: ' + (err.response?.data?.message || err.message));
        setLoading(false);
      }
    };
    fetchData();
    
    // Set up automatic refresh every 10 minutes as fallback (reduced from 5min since we have real-time updates)
    // This ensures expiration alerts show up even if no manual edits are made
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing inventory (fallback polling)...');
      fetchData();
    }, 10 * 60 * 1000); // 10 minutes (reduced from 5 since Socket.io handles real-time updates)
    
    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // 🔥 NEW: Socket.io connection for real-time inventory updates (Sprint 22)
  useEffect(() => {
    // Prevent duplicate initialization in Strict Mode
    if (socketInitializedRef.current) {
      console.log('[InventorySystem] Socket already initialized, skipping');
      return;
    }
    
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!token) {
      console.warn('[InventorySystem] No auth token found - socket connection skipped');
      return;
    }

    console.log('[InventorySystem] Initializing socket connection...');
    socketInitializedRef.current = true;
    
    const socketConnection = io(API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true
    });

    socketConnection.on('connect', () => {
      console.log('[InventorySystem] Socket connected:', socketConnection.id);
    });

    socketConnection.on('connect_error', (error) => {
      console.warn('[InventorySystem] Socket connection error:', error.message);
      // Don't disconnect on error - let reconnection logic handle it
    });

    socketConnection.on('disconnect', (reason) => {
      console.log('[InventorySystem] Socket disconnected:', reason);
    });
    
    socketConnection.on('error', (error) => {
      console.error('[InventorySystem] Socket error:', error);
    });

    setSocket(socketConnection);

    return () => {
      console.log('[InventorySystem] Cleaning up socket connection...');
      socketInitializedRef.current = false;
      if (socketConnection) {
        socketConnection.disconnect();
      }
    };
  }, []);

  // 🔥 NEW: Socket.io event listeners for real-time inventory updates (Sprint 22)
  useEffect(() => {
    if (!socket) return;

    console.log('[InventorySystem] Registering socket event listeners...');

    // Event 1: Stock level changed - update item quantities instantly
    socket.on('stockLevelChanged', (data) => {
      console.log('[InventorySystem] stockLevelChanged event received:', data);
      
      setItems(prevItems => prevItems.map(item => 
        item._id === data.itemId 
          ? { 
              ...item, 
              totalQuantity: data.newStock,
              inventory: data.inventory || item.inventory // Update batches if provided
            }
          : item
      ));

      // Log for debugging
      console.log(`[InventorySystem] Updated item ${data.itemId} stock to ${data.newStock} ${data.unit}`);
    });

    // Event 2: Reservation created - add to reservation list instantly
    socket.on('reservationCreated', (data) => {
      console.log('[InventorySystem] reservationCreated event received:', data);
      
      setInventoryReservations(prevReservations => {
        // Avoid duplicates
        const exists = prevReservations.some(r => r._id === data.reservation._id);
        if (exists) {
          console.log('[InventorySystem] Reservation already exists, skipping duplicate');
          return prevReservations;
        }
        return [data.reservation, ...prevReservations];
      });

      console.log(`[InventorySystem] Added new reservation: Order ${data.reservation.orderId}`);
    });

    // Event 3: Reservation completed - update status instantly, then remove after delay
    socket.on('reservationCompleted', (data) => {
      console.log('[InventorySystem] reservationCompleted event received:', data);
      
      // First update the status to show it's completed
      setInventoryReservations(prevReservations => 
        prevReservations.map(r => 
          r._id === data.reservationId 
            ? { ...r, status: 'consumed', completedAt: new Date().toISOString() }
            : r
        )
      );

      console.log(`[InventorySystem] Marked reservation ${data.reservationId} as consumed`);
      
      // Remove consumed reservation after 3 seconds (visual feedback time)
      setTimeout(() => {
        setInventoryReservations(prevReservations => 
          prevReservations.filter(r => r._id !== data.reservationId)
        );
        console.log(`[InventorySystem] Removed consumed reservation ${data.reservationId} from list`);
      }, 3000);
      
      // 🔥 NEW: Also refresh items to ensure stock levels update immediately
      // This is a fallback in case stockLevelChanged events are missed
      console.log('[InventorySystem] Triggering item refresh after reservation consumption...');
      axios.get(`${API_URL}/api/items`)
        .then(response => {
          setItems(response.data);
          console.log('[InventorySystem] Items refreshed after reservation consumption');
        })
        .catch(error => {
          console.error('[InventorySystem] Error refreshing items:', error);
        });
    });

    // Event 4: Reservation released/cancelled - remove from list instantly
    socket.on('reservationReleased', (data) => {
      console.log('[InventorySystem] reservationReleased event received:', data);
      
      setInventoryReservations(prevReservations => 
        prevReservations.filter(r => r._id !== data.reservationId)
      );

      console.log(`[InventorySystem] Removed reservation ${data.reservationId} from list`);
    });

    // Event 5: Alert triggered - add critical alert to list instantly
    socket.on('alertTriggered', (data) => {
      console.log('[InventorySystem] alertTriggered event received:', data);
      
      // Convert socket alert format to UI alert format
      const newAlert = {
        id: data.id,
        type: data.type === 'low_stock' ? 'stock' : data.type,
        message: data.message,
        date: new Date(data.timestamp).toISOString(),
        severity: data.severity,
        itemId: data.details?.itemId,
        itemName: data.details?.itemName,
        currentStock: data.details?.currentStock,
        unit: data.details?.unit
      };
      
      setAlerts(prevAlerts => {
        // Avoid duplicates (check if alert with same itemId already exists)
        const exists = prevAlerts.some(a => 
          a.itemId === newAlert.itemId && 
          a.type === newAlert.type &&
          Math.abs(new Date(a.date).getTime() - new Date(newAlert.date).getTime()) < 60000 // Within 1 minute
        );
        
        if (exists) {
          console.log('[InventorySystem] Alert already exists, skipping duplicate');
          return prevAlerts;
        }
        
        return [newAlert, ...prevAlerts];
      });

      console.log(`[InventorySystem] Added critical alert for ${data.details?.itemName}`);
    });

    // Listen for user logout events (multi-tab logout synchronization)
    socket.on('userLoggedOut', (data) => {
      console.log('[InventorySystem] User logged out event received:', data);
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userPosition');
      localStorage.removeItem('userRole');
      window.location.href = '/';
    });

    // Cleanup event listeners on unmount
    return () => {
      console.log('[InventorySystem] Cleaning up socket event listeners...');
      socket.off('stockLevelChanged');
      socket.off('reservationCreated');
      socket.off('reservationCompleted');
      socket.off('reservationReleased');
      socket.off('alertTriggered');
      socket.off('userLoggedOut');
    };
  }, [socket]);


  // New inventory feature functions
  const fetchInventoryReservations = async () => {
    // Throttle: 5-second cooldown to prevent spam clicking
    const now = Date.now();
    const THROTTLE_DELAY = 5000; // 5 seconds
    
    if (now - lastRefreshTime.current < THROTTLE_DELAY) {
      const remainingTime = Math.ceil((THROTTLE_DELAY - (now - lastRefreshTime.current)) / 1000);
      console.log(`Refresh throttled. Please wait ${remainingTime} more second(s).`);
      return;
    }
    
    setIsRefreshThrottled(true);
    lastRefreshTime.current = now;
    
    try {
      const response = await axios.get(`${API_URL}/api/inventory/reservations`);
      console.log('Reservations API response:', response.data);
      if (response.data.success) {
        // Handle nested response structure from backend
        const reservationsData = response.data.data?.data || response.data.data || [];
        console.log('Setting reservations:', reservationsData.length, 'items');
        
        // Filter out old consumed/released reservations (older than 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const filteredReservations = reservationsData.filter(r => {
          // Keep active/reserved reservations
          if (r.status === 'reserved' || r.status === 'active') return true;
          
          // For consumed/released, only keep recent ones (last 5 minutes)
          if (r.status === 'consumed' || r.status === 'released') {
            const completedTime = new Date(r.completedAt || r.updatedAt || r.createdAt);
            return completedTime > fiveMinutesAgo;
          }
          
          return true; // Keep other statuses
        });
        
        console.log('Filtered reservations:', filteredReservations.length, 'items (removed old consumed/released)');
        setInventoryReservations(Array.isArray(filteredReservations) ? filteredReservations : []);
      }
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      // Reset throttle after cooldown period
      setTimeout(() => setIsRefreshThrottled(false), THROTTLE_DELAY);
    }
  };



  const createReservation = async (orderData) => {
    try {
      const response = await axios.post(`${API_URL}/api/inventory/reserve`, orderData);
      if (response.data.success) {
        await fetchInventoryReservations();
        toast.success('Inventory reservation created successfully');
        return response.data.data;
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('Failed to create reservation: ' + (error.response?.data?.message || error.message));
    }
  };

  const completeReservation = async (reservationId) => {
    try {
      const response = await axios.patch(`${API_URL}/api/inventory/reservations/${reservationId}/complete`);
      if (response.data.success) {
        await fetchInventoryReservations();
        toast.success('Reservation completed successfully');
      }
    } catch (error) {
      console.error('Error completing reservation:', error);
      toast.error('Failed to complete reservation: ' + (error.response?.data?.message || error.message));
    }
  };

  const cancelReservation = async (reservationId) => {
    try {
      const response = await axios.delete(`${API_URL}/api/inventory/reservations/${reservationId}`);
      if (response.data.success) {
        await fetchInventoryReservations();
        toast.success('Reservation cancelled successfully');
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      toast.error('Failed to cancel reservation: ' + (error.response?.data?.message || error.message));
    }
  };
  const [lastAlertsHash, setLastAlertsHash] = useState('');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  useEffect(() => {
    // Skip if no items loaded yet
    if (!items.length) return;
    
    const allAlerts = items.flatMap(item => {
      const alerts = [];
      
      // Stock alerts with dynamic thresholds
      const threshold = item.minimumThreshold || 
                       (item.unit === 'pieces' ? 5 :
                        item.unit === 'grams' ? 500 :
                        item.unit === 'kilograms' ? 0.5 :
                        item.unit === 'milliliters' ? 500 :
                        item.unit === 'liters' ? 0.5 : 5);
                        
      if (item.totalQuantity <= threshold) {
        alerts.push({
          type: 'stock',
          id: item._id,
          message: `${item.name} is ${item.totalQuantity === 0 ? 'out of stock' : 'low on stock'} (${item.totalQuantity} ${item.unit} remaining)`,
          date: new Date().toISOString()
        });
      }
  
      // Expiration alerts from backend
      if (item.expirationAlerts?.length) {
        item.expirationAlerts.forEach(batch => {
          // Add validation for batch expiration date
          if (!batch.expirationDate || isNaN(new Date(batch.expirationDate))) {
            console.error('Invalid expiration date for batch:', batch);
            return;
          }
  
          const phExpDate = new Date(batch.expirationDate);
          phExpDate.setHours(phExpDate.getHours() + 8); // Convert to PH time
          
          // Ensure daysLeft is calculated safely
          const now = new Date();
          const timeDiff = phExpDate - now;
          const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
          alerts.push({
            type: 'expiration',
            id: `${item._id}-${batch._id}`,
            message: `${item.name} batch ${
              daysLeft >= 0 ? 'expiring in' : 'expired'
            } ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} (${
              phExpDate.toLocaleDateString('en-PH', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit' 
              })
            })`,
            date: batch.expirationDate
          });
        });
      }
  
      return alerts;
    });
    
    // Calculate hash of current alerts to detect actual changes
    const alertsHash = JSON.stringify(allAlerts.map(a => a.id + a.message));
    
    // Only show toasts on first load or when alerts actually change
    if (isFirstLoad || (alertsHash !== lastAlertsHash && !isFirstLoad)) {
      const MAX_TOAST_ITEMS = 3;
      const LARGE_LIST_THRESHOLD = 8;

      const renderAlertToast = (title, list) => {
        if (list.length > LARGE_LIST_THRESHOLD) {
          return (
            <div className="text-sm">
              <div className="font-semibold">{title}</div>
              <div className="mt-1 text-sm">{list.length} items</div>
              <div className="mt-2 text-xs text-gray-600">Open Inventory Alerts for details</div>
            </div>
          );
        }

        const shown = list.slice(0, MAX_TOAST_ITEMS);
        const remaining = list.length - shown.length;

        return (
          <div className="text-sm">
            <div className="font-semibold">{title}</div>
            <div className="mt-2 max-h-32 overflow-y-auto pr-2 space-y-1 break-words">
              {shown.map(a => (
                <div key={a.id} className="text-sm">
                  • {a.message}
                </div>
              ))}
            </div>
            {remaining > 0 && (
              <div className="mt-2 text-xs text-gray-600">+{remaining} more (see Inventory Alerts)</div>
            )}
          </div>
        );
      };

      // Group alerts by type for cleaner notification display
      const stockAlerts = allAlerts.filter(a => a.type === 'stock');
      const expirationAlerts = allAlerts.filter(a => a.type === 'expiration');
        // Show stock alerts first with specific details
      if (stockAlerts.length) {
        const outOfStock = stockAlerts.filter(a => a.message.includes('out of stock'));
        const lowStock = stockAlerts.filter(a => a.message.includes('low on stock'));
        
        if (outOfStock.length) {
          const itemNames = outOfStock.map(a => a.message.split(' is ')[0]).join(', ');
          toast.error(
            renderAlertToast('Out of Stock Items', outOfStock),
            {
              toastId: 'out-of-stock',
              autoClose: 3000,
              style: { maxWidth: 360 }
            }
          );
        }
        
        if (lowStock.length) {
          toast.warning(
            renderAlertToast('Low Stock Items', lowStock),
            {
              toastId: 'low-stock',
              autoClose: 3000,
              style: { maxWidth: 360 }
            }
          );
        }
      }
      
      // Then show expiration alerts with specific details
      if (expirationAlerts.length) {
        const expired = expirationAlerts.filter(a => a.message.includes('expired'));
        const expiringSoon = expirationAlerts.filter(a => !a.message.includes('expired'));
        
        if (expired.length) {
          toast.error(
            renderAlertToast('Expired Items', expired),
            {
              toastId: 'expired',
              autoClose: 7000, // Give more time to read
              style: { maxWidth: 360 }
            }
          );
        }
        
        if (expiringSoon.length) {
          toast.warning(
            renderAlertToast('Items Expiring Soon', expiringSoon),
            {
              toastId: 'expiring-soon',
              autoClose: 3000,
              style: { maxWidth: 360 }
            }
          );
        }
      }
    }
    
    // Update state
    setLastAlertsHash(alertsHash);
    setIsFirstLoad(false);
    setAlerts(allAlerts);
  }, [items]);

  // Filtered items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Audit log actions - persist to database
  const logAction = async (action, description, itemId = null, itemName = null, batchId = null, details = null) => {
    try {
      // For backward compatibility, if called with old signature (action, itemId)
      if (typeof description === 'string' && description.length === 24 && !itemId) {
        // Old format: logAction(action, itemId)
        const legacyItemId = description;
        description = action;
        action = 'other';
        itemId = legacyItemId;
      }
      
      const logEntry = {
        action: action || 'other',
        description: description || action,
        itemId,
        itemName,
        batchId,
        user: 'admin', // TODO: Get from auth context
        details
      };
      
      // Persist to database
      const { data: savedLog } = await axios.post(`${API_URL}/api/inventory-audit-logs`, logEntry);
      
      // Update local state
      setAuditLog(prevLogs => [...prevLogs, savedLog]);
    } catch (err) {
      console.error('Failed to save audit log:', err);
      // Still add to local state even if API fails
      setAuditLog(prevLogs => [...prevLogs, {
        id: Date.now(),
        action: action || 'other',
        description: description || action,
        itemId,
        itemName,
        batchId,
        user: 'admin',
        timestamp: new Date().toISOString(),
        details
      }]);
    }
  };

  // Updated consumption function for daily inventory tracking
  const recordConsumption = async (itemId, quantity) => {
    try {
      const { data } = await axios.patch(`${API_URL}/api/items/${itemId}/sell`, { quantity });
      
      const item = items.find(i => i._id === itemId);
      setItems(items.map(i => 
        i._id === itemId ? { 
          ...data,
          status: calculateStatus(data.totalQuantity) 
        } : i
      ));
      
      logAction('consumption', `Consumed ${quantity} ${item?.unit || 'units'}`, itemId, item?.name, null, { quantity });
    } catch (err) {
      setError('Failed to process consumption: ' + (err.response?.data?.message || err.message));
    }
  };

  // Add this helper function
  const calculateStatus = (totalQuantity) => {
    if (totalQuantity === 0) return 'Out of Stock';
    if (totalQuantity <= 5) return 'Low Stock';
    return 'In Stock';
  };

  // Format for unit display
  const formatQuantity = (quantity, unit) => {
    if (unit === 'kilograms' && quantity < 1) {
      return `${(quantity * 1000).toFixed(0)} g`;
    }
    if (unit === 'liters' && quantity < 1) {
      return `${(quantity * 1000).toFixed(0)} ml`;
    }
    return `${quantity} ${unit}`;
  };

  const handleRestock = async (e) => {
    e.preventDefault();
    try {
      // Convert local date to UTC-adjusted PH time
      const adjustForPHTime = (dateString) => {
        const localDate = new Date(dateString);
        // Convert to PH time midnight in UTC
        const phMidnightUTC = new Date(
          Date.UTC(
            localDate.getFullYear(),
            localDate.getMonth(),
            localDate.getDate(),
            16, // 16 hours = 24 - 8 (UTC+8)
            0,
            0,
            0
          )
        );
        return phMidnightUTC.toISOString();
      };

      const isCountBased = selectedItem?.isCountBased ?? selectedItem?.unit === 'pieces';
      const rawQuantity = Number(restockData.quantity);
      const rawCost = Number(restockData.cost);

      if (!Number.isFinite(rawQuantity) || rawQuantity <= 0) {
        setError('Please enter a valid quantity');
        return;
      }
      if (isCountBased && !Number.isInteger(rawQuantity)) {
        setError('Quantity must be a whole number for pieces');
        return;
      }
      if (!Number.isFinite(rawCost) || rawCost <= 0) {
        setError('Please enter a valid batch cost');
        return;
      }

      const trackExpiration = selectedItem?.trackExpiration !== false;
      if (trackExpiration && !restockData.expirationDate) {
        setError('Please select an expiration date');
        return;
      }

      const payload = {
        quantity: isCountBased ? parseInt(restockData.quantity, 10) : parseFloat(restockData.quantity),
        cost: parseFloat(restockData.cost),
        expirationDate: trackExpiration ? adjustForPHTime(restockData.expirationDate) : null
      };

      const { data } = await axios.patch(
        `${API_URL}/api/items/${selectedItem._id}/restock`,
        payload
      );

      setItems(items.map(item => 
        item._id === selectedItem._id ? data : item
      ));

      setShowRestockModal(false);
      setRestockData({ quantity: '', expirationDate: '', cost: '' });
      
      // Calculate unit price for log
      const unitPrice = payload.quantity > 0 ? (payload.cost / payload.quantity).toFixed(4) : 0;
      logAction(
        'restock',
        `Restocked ${restockData.quantity} ${selectedItem.unit} @ ₱${restockData.cost} (₱${unitPrice}/${selectedItem.unit})`,
        selectedItem._id,
        selectedItem.name,
        data.newBatchId,
        { quantity: payload.quantity, cost: payload.cost, unitPrice: parseFloat(unitPrice) }
      );
    } catch (err) {
      setError('Failed to restock item: ' + (err.response?.data?.message || err.message));
    }
  };

  // Unit conversion handler
  const handleConversion = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/api/items/convert`, conversionData);
      setConversionResult(data);
    } catch (err) {
      setError('Failed to convert units: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle batch end-of-day update
  const handleEndDayUpdate = async (e) => {
    e.preventDefault();
    try {
      // Make sure endQuantities is properly included in the request body
      const { data } = await axios.patch(
        `${API_URL}/api/items/${selectedItemForEndDay._id}/end-day`,
        { endQuantities: endDayQuantities }  // Ensure it's named exactly like the backend expects
      );
      
      setItems(items.map(item => 
        item._id === selectedItemForEndDay._id ? data : item
      ));
      
      setShowDailyInventoryModal(false);
      setSelectedItemForEndDay(null);
      setEndDayQuantities([]);
      
      logAction('end_day_count', `Updated end-of-day quantities`, selectedItemForEndDay._id, selectedItemForEndDay.name);
    } catch (err) {
      // Display error message without crashing the component
      console.error('End day update error:', err);
      setError('Failed to update end-of-day quantities: ' + (err.response?.data?.message || err.message));
      
      // Keep the modal open so the user can try again
      // instead of closing it when an error occurs
    }
  };

  // Handle bulk end-of-day update
  const handleBulkEndDayUpdate = async (e) => {
    e.preventDefault();
    setBulkOperationLoading(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/items/bulk-end-day`,
        { itemQuantities: bulkEndDayQuantities }
      );
      
      if (data.success) {
        // Update the items with the new data
        const updatedItems = [...items];
        data.updated.forEach(update => {
          const index = updatedItems.findIndex(item => item._id === update.itemId);
          if (index !== -1) {
            updatedItems[index] = {
              ...updatedItems[index],
              status: update.status
            };
          }
        });
        
        setItems(updatedItems);
        setShowBulkEndDayModal(false);
        setSelectedItems([]);
        setBulkEndDayQuantities([]);
        
        logAction('end_day_count', `Updated end-of-day quantities for ${data.updated.length} items`, null, 'bulk');
      } else {
        setError(`Some items failed to update: ${data.message}`);
      }
    } catch (err) {
      console.error('Bulk end day update error:', err);
      setError('Failed to update bulk end-of-day quantities: ' + (err.response?.data?.message || err.message));
    } finally {
      setBulkOperationLoading(false);
    }
  };

  // Start day for all inventory items
  const handleStartDay = async () => {
    try {
      await axios.post(`${API_URL}/api/items/start-day`);
      
      // Refresh items data
      const { data } = await axios.get(`${API_URL}/api/items`);
      setItems(data);
      
      logAction('other', 'Started day - recorded beginning inventory', null, 'all');
    } catch (err) {
      setError('Failed to record starting inventory: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle deletion
  const handleDelete = async (itemId) => {
    try {
      const itemToDelete = items.find(item => item._id === itemId);
      await axios.delete(`${API_URL}/api/items/${itemId}`);
      setItems(items.filter(item => item._id !== itemId));
      
      // Log item deletion
      logAction('delete_item', `Deleted item: ${itemToDelete?.name || itemId}`, itemId, itemToDelete?.name);
    } catch (err) {
      setError('Failed to delete item: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle exports
  const exportData = (format) => {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: `text/${format};charset=utf-8` });
    saveAs(blob, `inventory-${new Date().toISOString()}.${format}`);
  };

  // Expiry handling
  const handleDispose = async (itemId, batchId) => {
    try {
      const { data } = await axios.patch(
        `${API_URL}/api/items/${itemId}/dispose-expired`,
        { batchIds: [batchId] }
      );
      
      const itemName = items.find(i => i._id === itemId)?.name;
      setItems(items.map(item => 
        item._id === itemId ? { ...data } : item
      ));
      
      toast.success("Successfully disposed of expired batch");
      logAction('dispose', `Disposed expired batch`, itemId, itemName, batchId);
    } catch (err) {
      toast.error('Failed to dispose expired batch: ' + (err.response?.data?.message || err.message));
    }
  };

  // Inventory batch management
  const addBatch = () => {
    const newInventory = [...newItem.inventory, { quantity: '', expirationDate: '' }];
    const cost = Number.isFinite(parseFloat(newItem.cost)) ? parseFloat(newItem.cost) : 0;
    const totalQty = newInventory.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
    const unitPrice = totalQty > 0 ? (cost / totalQty).toFixed(4) : 0;
    setNewItem({
      ...newItem,
      inventory: newInventory,
      price: parseFloat(unitPrice)
    });
  };

  const removeBatch = (index) => {
    const newInventory = newItem.inventory.filter((_, i) => i !== index);
    const cost = Number.isFinite(parseFloat(newItem.cost)) ? parseFloat(newItem.cost) : 0;
    const totalQty = newInventory.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
    const unitPrice = totalQty > 0 ? (cost / totalQty).toFixed(4) : 0;
    setNewItem({ ...newItem, inventory: newInventory, price: parseFloat(unitPrice) });
  };

  const handleBatchChange = (index, field, value) => {
    const newInventory = [...newItem.inventory];
    newInventory[index][field] = value;
    
    // If quantity changed, recalculate unit price
    if (field === 'quantity') {
      const cost = Number.isFinite(parseFloat(newItem.cost)) ? parseFloat(newItem.cost) : 0;
      const totalQty = newInventory.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
      const unitPrice = totalQty > 0 ? (cost / totalQty).toFixed(4) : 0;
      setNewItem({ ...newItem, inventory: newInventory, price: parseFloat(unitPrice) });
    } else {
      setNewItem({ ...newItem, inventory: newInventory });
    }
  };
  // Update a batch quantity in bulk end-day mode
  const updateBulkEndDayQuantity = (itemIndex, batchIndex, newQuantity) => {
    const newBulkQuantities = [...bulkEndDayQuantities];
    newBulkQuantities[itemIndex].endQuantities[batchIndex].quantity = newQuantity;
    setBulkEndDayQuantities(newBulkQuantities);
  };

  // Reset form function
  const resetForm = () => {
    setNewItem({
      name: '',
      category: '',
      unit: 'pieces',
      cost: '',
      price: 0,
      vendor: '',
      inventory: [],
      trackExpiration: true,
      isCountBased: true,
      minimumThreshold: 5
    });
  setEditingItem(null);
    setShowVendorAccordion(false);
  };

  // Handle vendor selection (for edit modal)
  const handleVendorSelection = (e) => {
    const value = e.target.value;
    if (value === 'new') {
      setShowVendorAccordion(true);
      setNewItem({...newItem, vendor: ''});
    } else {
      setNewItem({...newItem, vendor: value});
      setShowVendorAccordion(false);
    }
  };

  // Handle item form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate inventory batches
      if (newItem.inventory.length === 0) {
        throw new Error('At least one inventory batch is required');
      }

      if (newItem.trackExpiration) {
        const hasMissingExpiry = newItem.inventory.some(b => !b.expirationDate);
        if (hasMissingExpiry) {
          throw new Error('Expiration date is required for all batches (or disable Track Expiration Dates)');
        }
      }
      
      // Set isCountBased based on unit
      const isCountBased = newItem.unit === 'pieces';

      const cost = Number.isFinite(parseFloat(newItem.cost)) ? parseFloat(newItem.cost) : 0;
      const totalQty = newItem.inventory.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
      const price = totalQty > 0 ? parseFloat((cost / totalQty).toFixed(4)) : 0;

      const defaultMinimumThreshold =
        isCountBased ? 5 :
        (newItem.unit === 'grams' ? 500 :
         newItem.unit === 'kilograms' ? 0.5 :
         newItem.unit === 'milliliters' ? 500 :
         newItem.unit === 'liters' ? 0.5 : 5);

      const minimumThreshold =
        newItem.minimumThreshold === '' || newItem.minimumThreshold === null || newItem.minimumThreshold === undefined
          ? defaultMinimumThreshold
          : Number(newItem.minimumThreshold);

      const itemToSubmit = {
        ...newItem,
        cost,
        price,
        inventory: newItem.inventory.map(b => ({
          ...b,
          expirationDate: newItem.trackExpiration ? b.expirationDate : null
        })),
        isCountBased,
        minimumThreshold
      };
        const { data } = await axios.post(`${API_URL}/api/items`, itemToSubmit);
      setItems([...items, data]);
      setShowAddModal(false);
      resetForm();
      
      // Log item creation
      logAction('add_item', `Added new item: ${data.name}`, data._id, data.name, null, { 
        cost: data.cost, 
        quantity: data.totalQuantity,
        unit: data.unit
      });
    } catch (err) {
      setError('Failed to add new item: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle editing an item
  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      category: item.category,
      unit: item.unit,
      cost: item.cost === null || item.cost === undefined ? '' : String(item.cost),
      price: item.price,
      vendor: item.vendor,
      trackExpiration: item.trackExpiration !== false,
      // Convert Date objects to YYYY-MM-DD format for HTML date inputs
      inventory: item.inventory.map(batch => ({
        ...batch,
        expirationDate: batch.expirationDate
          ? businessDateKey(new Date(batch.expirationDate))
          : ''
      })),
      isCountBased: item.isCountBased,
      minimumThreshold: item.minimumThreshold
    });
    setShowEditModal(true);
  };

  // Handle edit submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate inventory batches
      if (newItem.inventory.length === 0) {
        throw new Error('At least one inventory batch is required');
      }

      if (newItem.trackExpiration) {
        const hasMissingExpiry = newItem.inventory.some(b => !b.expirationDate);
        if (hasMissingExpiry) {
          throw new Error('Expiration date is required for all batches (or disable Track Expiration Dates)');
        }
      }
      
      // Set isCountBased based on unit
      const isCountBased = newItem.unit === 'pieces';

      const cost = Number.isFinite(parseFloat(newItem.cost)) ? parseFloat(newItem.cost) : 0;
      const totalQty = newItem.inventory.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
      const price = totalQty > 0 ? parseFloat((cost / totalQty).toFixed(4)) : 0;

      const defaultMinimumThreshold =
        isCountBased ? 5 :
        (newItem.unit === 'grams' ? 500 :
         newItem.unit === 'kilograms' ? 0.5 :
         newItem.unit === 'milliliters' ? 500 :
         newItem.unit === 'liters' ? 0.5 : 5);

      const minimumThreshold =
        newItem.minimumThreshold === '' || newItem.minimumThreshold === null || newItem.minimumThreshold === undefined
          ? defaultMinimumThreshold
          : Number(newItem.minimumThreshold);

      const itemToSubmit = {
        ...newItem,
        cost,
        price,
        inventory: newItem.inventory.map(b => ({
          ...b,
          expirationDate: newItem.trackExpiration ? b.expirationDate : null
        })),
        isCountBased,
        minimumThreshold
      };
      
      const { data } = await axios.put(`${API_URL}/api/items/${editingItem._id}`, itemToSubmit);
        setItems(items.map(item => 
        item._id === editingItem._id ? data : item
      ));
      setShowEditModal(false);
      resetForm();
      
      logAction('edit_item', `Updated item: ${data.name}`, editingItem._id, data.name);
    } catch (err) {
      setError('Failed to update item: ' + (err.response?.data?.message || err.message));
    }
  };

  // Handle vendor submission
  const handleVendorSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/api/vendors`, newVendor);
      setVendors([...vendors, data]);
      setNewVendor({
        name: '',
        contact: { email: '', phone: '' },
        address: { street: '', city: '', state: '', zipCode: '' },
        paymentTerms: 'NET_30'
      });
      setShowVendorAccordion(false);
    } catch (err) {
      setError('Failed to add new vendor: ' + (err.response?.data?.message || err.message));
    }
  };

  // Reports data formatting
  const categoryData = Object.entries(
    items.reduce((acc, item) => ({
      ...acc,
      [item.category]: (acc[item.category] || 0) + item.totalQuantity
    }), {})
  ).map(([name, value]) => ({ name, value }));

  // Loading and error states
  if (loading) {
    return (
      <BrandedLoadingScreen message="Loading inventory data..." />
    );
  }
  

  const getMainContentMargin = () => {
    if (windowWidth < 768) return '0';
    return windowWidth >= 1920 ? '8rem' : '5rem';
  };

  // Format peso values
  const formatPeso = (value) => {
    return `₱${parseFloat(value).toFixed(2)}`;
  };

  // Status colors
  const getStatusColor = (status) => {
    switch (status) {
      case 'In Stock':
        return { bg: '#d1fae5', text: '#047857' };
      case 'Low Stock':
        return { bg: '#fef3c7', text: '#b45309' };
      case 'Out of Stock':
        return { bg: '#fee2e2', text: '#b91c1c' };
      default:
        return { bg: '#e5e7eb', text: '#374151' };
    }
  };

  // Handle preparing for end-day inventory count
  const prepareEndDayCount = (item) => {
    setSelectedItemForEndDay(item);
    setEndDayQuantities(
      item.inventory.map(batch => ({
        batchId: batch._id,
        quantity: batch.quantity,
        expirationDate: new Date(batch.expirationDate).toLocaleDateString()
      }))
    );
    setShowDailyInventoryModal(true);
  };

  // Handle preparing for bulk end-day inventory count
  const prepareBulkEndDayCount = () => {
    // Filter out items with no inventory
    const itemsWithInventory = filteredItems.filter(item => item.inventory && item.inventory.length > 0);
    
    setSelectedItems(itemsWithInventory);
    
    // Initialize the bulk end day quantities structure
    const initialBulkQuantities = itemsWithInventory.map(item => ({
      itemId: item._id,
      name: item.name,
      unit: item.unit,
      endQuantities: item.inventory.map(batch => ({
        batchId: batch._id,
        quantity: batch.quantity,
        expirationDate: new Date(batch.expirationDate).toLocaleDateString()
      }))
    }));
    
    setBulkEndDayQuantities(initialBulkQuantities);
    setShowBulkEndDayModal(true);
  };  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
      
      <div 
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ 
          marginLeft: getMainContentMargin(),
          paddingTop: windowWidth < 768 ? '4rem' : '0'
        }}
      >
        {error && (
          <div className="p-4 bg-red-100 text-red-700 border-b">
            {error}
          </div>
        )}

        <div className="px-6 pt-6 pb-2">
          <h1 className="text-2xl font-bold mb-4" style={{ color: colors.primary }}>
            Ring & Wing Café Inventory System
          </h1>
          
          <div className="flex flex-wrap items-center justify-between gap-4">
            <AlertDashboard 
              alerts={alerts} 
              onRestock={(alertId) => {
                const alert = alerts.find(a => a.id === alertId);
                if (alert?.type === 'stock') {
                  const itemToRestock = items.find(item => item._id === alert.id);
                  if (itemToRestock) {
                    setSelectedItem(itemToRestock);
                    setShowRestockModal(true);
                  }
                }
              }}
              onDispose={(itemId, batchId) => handleDispose(itemId, batchId)}
            />
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <div className="w-full sm:w-[280px]">
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="p-2 border rounded w-full"
                  style={{ borderColor: colors.muted }}
                />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="p-2 border rounded w-full sm:w-[200px]"
                style={{ borderColor: colors.muted }}
              >
                <option value="All">All Categories</option>
                {Array.from(new Set(items.map(item => item.category))).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <Button
                onClick={() => setShowAddModal(true)}
                variant="accent"
              >
                Add New Item
              </Button>
            </div>
          </div>
        </div>

        <div className="px-6 mb-4 flex flex-wrap gap-2">
          <Button
            onClick={prepareBulkEndDayCount}
            variant="accent"
          >
            Bulk End-of-Day Count
          </Button>
          <Button
            onClick={() => setShowReservationsModal(true)}
            variant="primary"
          >
            Inventory Reservations ({inventoryReservations.length})
          </Button>
          <Button
            onClick={async () => {
              toast.info('Checking for expired items...', { autoClose: 1000 });
              try {
                const itemsRes = await axios.get(`${API_URL}/api/items`);
                setItems(itemsRes.data);
                toast.success('Inventory refreshed!', { autoClose: 2000 });
              } catch (err) {
                toast.error('Failed to refresh: ' + err.message);
              }
            }}
            variant="primary"
            title="Manually refresh inventory to check for newly expired items"
          >
            Check Expiration
          </Button>
          <Button
            onClick={() => setShowConversionModal(true)}
            variant="primary"
          >
            Convert Units
          </Button>
          <Button
            onClick={() => setShowReports(true)}
            variant="primary"
          >
            Analytics
          </Button>
          <Button
            onClick={() => setShowAuditLog(true)}
            variant="primary"
          >
            Audit Log
          </Button>
        </div>

        <div className="rounded-lg overflow-hidden border mx-6" style={{ borderColor: colors.muted }}>
          <div className="overflow-auto relative z-0" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            <table className="w-full">
              <thead
                className="sticky top-0 z-[1]"
                style={{
                  // Opaque base prevents row text from showing through,
                  // tinted overlay keeps the project's "translucent" header look.
                  backgroundColor: colors.background,
                  backgroundImage: `linear-gradient(${colors.activeBg}, ${colors.activeBg})`,
                  borderBottom: `1px solid ${colors.muted}`,
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  isolation: 'isolate'
                }}
              >
                <tr>
                  {['Item Name', 'Category', 'Status', 'Quantity', 'Unit', 'Cost', 'Price', 'Vendor', 'Actions'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-sm font-semibold" style={{ color: colors.primary }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item._id} className="border-t" style={{ borderColor: colors.muted }}>
                    <td className="px-4 py-3" style={{ color: colors.primary }}>{item.name}</td>
                    <td className="px-4 py-3" style={{ color: colors.secondary }}>{item.category}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-sm whitespace-nowrap"
                        style={{ backgroundColor: getStatusColor(item.status).bg, color: getStatusColor(item.status).text }}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: colors.primary }}>{item.totalQuantity}</td>
                    <td className="px-4 py-3" style={{ color: colors.secondary }}>{item.unit}</td>
                    <td className="px-4 py-3" style={{ color: colors.primary }}>{formatPeso(item.cost)}</td>
                    <td className="px-4 py-3" style={{ color: colors.primary }}>{formatPeso(item.price)}</td>
                    <td className="px-4 py-3" style={{ color: colors.secondary }}>{item.vendor}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 flex-nowrap">
                      <Button
                        onClick={() => prepareEndDayCount(item)}
                        variant="accent"
                        size="sm"
                        className="px-2"
                      >
                        End-Day Count
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedItem(item);
                          setShowRestockModal(true);
                        }}
                        variant="primary"
                        size="sm"
                        className="px-2"
                      >
                        Restock
                      </Button>
                      <Button
                        onClick={() => handleEditItem(item)}
                        variant="primary"
                        size="sm"
                        className="px-2"
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(item._id)}
                        variant="ghost"
                        size="sm"
                        className="px-2"
                      >
                        Delete
                      </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            resetForm();
          }}
          title="Add New Inventory Item"
          size="2xl"
        >
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Item Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1">Item Name</label>
                    <input
                      type="text"
                      required
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                  </div>

                  {/* Category & Vendor */}
                  <div>
                    <label className="block text-sm mb-1">Category</label>
                    <select
                      required
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    >
                      <option value="">Select Category</option>
                      {['Food', 'Beverages', 'Ingredients', 'Packaging'].map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Vendor</label>
                    <div className="flex gap-2">
                      <select
                        required
                        value={newItem.vendor}
                        onChange={(e) => setNewItem({...newItem, vendor: e.target.value})}
                        className="w-full p-2 border rounded"
                        style={{ borderColor: colors.muted }}
                      >
                        <option value="">Select Vendor</option>
                        {vendors.map(vendor => (                        <option key={vendor._id} value={vendor.name}>{vendor.name}</option>
                        ))}
                      </select>
                      <Button
                        onClick={() => setShowVendorAccordion(!showVendorAccordion)}
                        variant="accent"
                        size="sm"
                      >
                        {showVendorAccordion ? '−' : '+'}
                      </Button>
                    </div>
                  </div>

                  {/* Unit Selection */}
                  <div>
                    <label className="block text-sm mb-1">Unit</label>
                    <select
                      required
                      value={newItem.unit}
                      onChange={(e) => setNewItem({
                        ...newItem, 
                        unit: e.target.value,
                        isCountBased: e.target.value === 'pieces',
                        minimumThreshold: e.target.value === 'pieces' ? 5 : 
                                         e.target.value === 'grams' ? 500 :
                                         e.target.value === 'kilograms' ? 0.5 :
                                         e.target.value === 'milliliters' ? 500 :
                                         e.target.value === 'liters' ? 0.5 : 5
                      })}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    >
                      <option value="pieces">Pieces</option>
                      <option value="grams">Grams</option>
                      <option value="kilograms">Kilograms</option>
                      <option value="milliliters">Milliliters</option>
                      <option value="liters">Liters</option>
                    </select>
                  </div>

                  {/* Minimum Threshold */}
                  <div>
                    <label className="block text-sm mb-1">Minimum Threshold</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step={newItem.unit === 'kilograms' || newItem.unit === 'liters' ? '0.1' : '1'}
                      value={newItem.minimumThreshold}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setNewItem({
                          ...newItem,
                          minimumThreshold: raw === '' ? '' : parseFloat(raw)
                        });
                      }}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                    <small className="text-xs text-gray-500">
                      Low stock warning will appear when quantity falls below this value
                    </small>
                  </div>

                  {/* Inventory Batches */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm">Inventory Batches</label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={newItem.trackExpiration}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setNewItem({
                              ...newItem,
                              trackExpiration: next,
                              inventory: next
                                ? newItem.inventory
                                : newItem.inventory.map(b => ({ ...b, expirationDate: '' }))
                            });
                          }}
                        />
                        Track Expiration Dates
                      </label>
                    </div>
                    <div className="space-y-2">
                      {newItem.inventory.map((batch, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="number"
                            required
                            min="0"
                            step={newItem.unit === 'kilograms' || newItem.unit === 'liters' ? '0.1' : '1'}
                            value={batch.quantity}
                            onChange={(e) => handleBatchChange(index, 'quantity', e.target.value)}
                            className="p-2 border rounded flex-1"
                            style={{ borderColor: colors.muted }}
                            placeholder="Quantity"
                          />
                          {newItem.trackExpiration ? (
                            <input
                              type="date"
                              required
                              value={batch.expirationDate}
                              onChange={(e) => handleBatchChange(index, 'expirationDate', e.target.value)}
                              className="p-2 border rounded flex-1"
                              style={{ borderColor: colors.muted }}
                            />
                          ) : (
                            <div
                              className="p-2 border rounded flex-1 text-sm text-gray-500 bg-gray-50"
                              style={{ borderColor: colors.muted }}
                            >
                              No expiration
                            </div>
                          )}

                          <Button
                            type="button"
                            onClick={() => removeBatch(index)}
                            variant="ghost"
                            size="sm"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      onClick={addBatch}
                      variant="accent"
                      size="sm"
                      className="mt-2"
                    >
                      Add Batch
                    </Button>
                  </div>

                  {/* Cost & Price */}
                  <div>
                    <label className="block text-sm mb-1">Total Batch Cost (₱) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={newItem.cost}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const cost = Number.isFinite(parseFloat(raw)) ? parseFloat(raw) : 0;
                        const totalQty = newItem.inventory.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
                        const unitPrice = totalQty > 0 ? (cost / totalQty).toFixed(4) : 0;
                        setNewItem({ ...newItem, cost: raw, price: parseFloat(unitPrice) });
                      }}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                    <small className="text-xs text-gray-500">Enter the total cost of all batches combined</small>
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-1">Unit Price (₱) - Auto-calculated</label>
                    <input
                      type="number"
                      step="0.0001"
                      readOnly
                      value={(() => {
                        const totalQty = newItem.inventory.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
                        return totalQty > 0 ? ((newItem.cost || 0) / totalQty).toFixed(4) : '0.0000';
                      })()}
                      className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
                      style={{ borderColor: colors.muted }}
                    />
                    <small className="text-xs text-gray-500">Unit Price = Total Cost ÷ Total Quantity</small>
                  </div>
                </div>


   
                {/* Vendor Creation Accordion */}
                {showVendorAccordion && (
                  <div className="md:col-span-2 mt-4 p-4 border rounded" style={{ borderColor: colors.muted }}>
                    <h3 className="text-sm font-medium mb-3">New Vendor Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs mb-1">Vendor Name *</label>
                        <input
                          type="text"
                          required
                          value={newVendor.name}
                          onChange={(e) => setNewVendor({...newVendor, name: e.target.value})}
                          className="w-full p-2 border rounded text-sm"
                          style={{ borderColor: colors.muted }}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs mb-1">Email (optional)</label>
                          <input
                            type="email"
                            value={newVendor.contact.email}
                            onChange={(e) => setNewVendor({
                              ...newVendor,
                              contact: {...newVendor.contact, email: e.target.value}
                            })}
                            className="w-full p-2 border rounded text-sm"
                            style={{ borderColor: colors.muted }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">Phone (optional)</label>
                          <input
                            type="tel"
                            value={newVendor.contact.phone}
                            onChange={(e) => setNewVendor({
                              ...newVendor,
                              contact: {...newVendor.contact, phone: e.target.value}
                            })}
                            className="w-full p-2 border rounded text-sm"
                            style={{ borderColor: colors.muted }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          type="button"
                          onClick={() => setShowVendorAccordion(false)}
                          variant="ghost"
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleVendorSubmit}
                          variant="accent"
                          size="sm"
                        >
                          Add Vendor
                        </Button>
                      </div>
                    </div>
                  </div>
                )}                <div className="mt-6 flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        resetForm();
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                    >
                      Add Item
                    </Button>
                  </div>
                </div>
              </form>
        </Modal>



        {/* Edit Item Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            resetForm();
          }}
          title="Edit Item"
          size="2xl"
        >
              <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Item Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1">Item Name</label>
                    <input
                      type="text"
                      required
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                  </div>

                  {/* Category & Vendor */}
                  <div>
                    <label className="block text-sm mb-1">Category</label>
                    <select
                      required
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    >
                      <option value="">Select Category</option>
                      {['Food', 'Beverages', 'Ingredients', 'Packaging'].map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Vendor</label>
                    <div className="flex gap-2">
                      <select
                        required
                        value={newItem.vendor}
                        onChange={handleVendorSelection}
                        className="flex-1 p-2 border rounded"
                        style={{ borderColor: colors.muted }}
                      >                        <option value="">Select Vendor</option>
                        {vendors.map(vendor => (
                          <option key={vendor._id} value={vendor.name}>{vendor.name}</option>
                        ))}
                        <option value="new">+ Add New Vendor</option>
                      </select>
                    </div>
                  </div>

                  {/* Unit */}
                  <div>
                    <label className="block text-sm mb-1">Unit</label>
                    <select
                      required
                      value={newItem.unit}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    >
                      <option value="">Select Unit</option>
                      {['pieces', 'kilograms', 'liters', 'packs'].map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>

                  {/* Minimum Stock */}
                  <div>
                    <label className="block text-sm mb-1">Minimum Stock Alert</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step={newItem.unit === 'kilograms' || newItem.unit === 'liters' ? '0.1' : '1'}
                      value={newItem.minimumThreshold}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setNewItem({
                          ...newItem,
                          minimumThreshold: raw === '' ? '' : parseFloat(raw)
                        });
                      }}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                  </div>                  {/* Initial Batches */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm">Batches</label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={newItem.trackExpiration}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setNewItem({
                              ...newItem,
                              trackExpiration: next,
                              inventory: next
                                ? newItem.inventory
                                : newItem.inventory.map(b => ({ ...b, expirationDate: '' }))
                            });
                          }}
                        />
                        Track Expiration Dates
                      </label>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded" style={{ borderColor: colors.muted }}>
                      {newItem.inventory.map((batch, index) => (
                        <div key={index} className="flex gap-2 items-center p-2 bg-gray-50 rounded">
                          <div className="flex-1">
                            <input
                              type="number"
                              placeholder="Quantity"
                              required
                              min="0"                              step={newItem.unit === 'kilograms' || newItem.unit === 'liters' ? '0.1' : '1'}
                              value={batch.quantity}
                              onChange={(e) => handleBatchChange(index, 'quantity', parseFloat(e.target.value))}
                              className="w-full p-1 border rounded text-sm"
                              style={{ borderColor: colors.muted }}
                            />
                          </div>
                          <div className="flex-1">
                            {newItem.trackExpiration ? (
                              <input
                                type="date"
                                required
                                value={batch.expirationDate}
                                onChange={(e) => handleBatchChange(index, 'expirationDate', e.target.value)}
                                className="w-full p-1 border rounded text-sm"
                                style={{ borderColor: colors.muted }}
                              />
                            ) : (
                              <div
                                className="w-full p-1 border rounded text-sm text-gray-500 bg-gray-50"
                                style={{ borderColor: colors.muted }}
                              >
                                No expiration
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            onClick={() => removeBatch(index)}
                            variant="ghost"
                            size="sm"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      onClick={addBatch}
                      variant="accent"
                      size="sm"
                      className="mt-2"
                    >
                      Add Batch
                    </Button>
                  </div>

                  {/* Cost & Price */}
                  <div>
                    <label className="block text-sm mb-1">Total Batch Cost (₱) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={newItem.cost}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const cost = Number.isFinite(parseFloat(raw)) ? parseFloat(raw) : 0;
                        const totalQty = newItem.inventory.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
                        const unitPrice = totalQty > 0 ? (cost / totalQty).toFixed(4) : 0;
                        setNewItem({ ...newItem, cost: raw, price: parseFloat(unitPrice) });
                      }}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: colors.muted }}
                    />
                    <small className="text-xs text-gray-500">Enter the total cost of all batches combined</small>
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-1">Unit Price (₱) - Auto-calculated</label>
                    <input
                      type="number"
                      step="0.0001"
                      readOnly
                      value={(() => {
                        const totalQty = newItem.inventory.reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0);
                        return totalQty > 0 ? ((newItem.cost || 0) / totalQty).toFixed(4) : '0.0000';
                      })()}
                      className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
                      style={{ borderColor: colors.muted }}
                    />
                    <small className="text-xs text-gray-500">Unit Price = Total Cost ÷ Total Quantity</small>
                  </div>
                </div>

                {/* Vendor Creation Accordion */}
                {showVendorAccordion && (
                  <div className="md:col-span-2 mt-4 p-4 border rounded" style={{ borderColor: colors.muted }}>
                    <h3 className="text-sm font-medium mb-3">New Vendor Details</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs mb-1">Vendor Name *</label>
                        <input
                          type="text"
                          required
                          value={newVendor.name}
                          onChange={(e) => setNewVendor({...newVendor, name: e.target.value})}
                          className="w-full p-2 border rounded text-sm"
                          style={{ borderColor: colors.muted }}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs mb-1">Email (optional)</label>
                          <input
                            type="email"
                            value={newVendor.contact.email}
                            onChange={(e) => setNewVendor({
                              ...newVendor,
                              contact: {...newVendor.contact, email: e.target.value}
                            })}
                            className="w-full p-2 border rounded text-sm"
                            style={{ borderColor: colors.muted }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1">Phone (optional)</label>
                          <input
                            type="tel"
                            value={newVendor.contact.phone}
                            onChange={(e) => setNewVendor({
                              ...newVendor,
                              contact: {...newVendor.contact, phone: e.target.value}
                            })}
                            className="w-full p-2 border rounded text-sm"
                            style={{ borderColor: colors.muted }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          type="button"
                          onClick={() => setShowVendorAccordion(false)}
                          variant="ghost"
                          size="sm"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleVendorSubmit}
                          variant="accent"
                          size="sm"
                        >
                          Add Vendor
                        </Button>
                      </div>
                    </div>
                  </div>
                )}                <div className="mt-6 flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        resetForm();
                      }}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                    >
                      Update Item
                    </Button>
                  </div>
                </div>
              </form>
        </Modal>

<Modal
  isOpen={showRestockModal}
  onClose={() => {
    setShowRestockModal(false);
    setRestockData({ quantity: '', expirationDate: '', cost: '' });
  }}
  title={`Restock ${selectedItem?.name}`}
  size="md"
>
      <form onSubmit={handleRestock}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Quantity ({selectedItem?.unit})</label>
            <input
              type="number"
              required
              min={selectedItem?.unit === 'kilograms' || selectedItem?.unit === 'liters' ? '0.1' : '1'}
              step={selectedItem?.unit === 'kilograms' || selectedItem?.unit === 'liters' ? '0.1' : '1'}
              value={restockData.quantity}
              onChange={(e) => setRestockData({...restockData, quantity: e.target.value})}
              className="w-full p-2 border rounded"
              style={{ borderColor: colors.muted }}
              placeholder={`Enter quantity in ${selectedItem?.unit}`}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Batch Cost (₱) *</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={restockData.cost}
              onChange={(e) => setRestockData({...restockData, cost: e.target.value})}
              className="w-full p-2 border rounded"
              style={{ borderColor: colors.muted }}
              placeholder="Total cost for this batch"
            />
            <small className="text-xs text-gray-500">Enter the total cost you paid for this restock batch</small>
          </div>
          {restockData.quantity && restockData.cost && parseFloat(restockData.quantity) > 0 && (
            <div className="p-3 rounded bg-gray-50">
              <label className="block text-sm mb-1 text-gray-600">Calculated Unit Price</label>
              <div className="text-lg font-semibold" style={{ color: colors.primary }}>
                ₱{(parseFloat(restockData.cost) / parseFloat(restockData.quantity)).toFixed(4)} per {selectedItem?.unit}
              </div>
            </div>
          )}
          {selectedItem?.trackExpiration !== false ? (
            <div>
              <label className="block text-sm mb-1">Expiration Date</label>
              <input
                type="date"
                required
                value={restockData.expirationDate}
                onChange={(e) => setRestockData({...restockData, expirationDate: e.target.value})}
                className="w-full p-2 border rounded"
                style={{ borderColor: colors.muted }}
              />
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              Expiration tracking is disabled for this item.
            </div>
          )}
        </div>        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            onClick={() => {
              setShowRestockModal(false);
              setRestockData({ quantity: '', expirationDate: '', cost: '' });
            }}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
          >
            Confirm Restock
          </Button>
        </div>
      </form>
</Modal>

{/* Daily Inventory Modal */}
{/* Daily Inventory Modal */}
<Modal
  isOpen={showDailyInventoryModal && selectedItemForEndDay}
  onClose={() => {
     setShowDailyInventoryModal(false);
     setSelectedItemForEndDay(null);
  }}
  title={`End-of-Day Count: ${selectedItemForEndDay?.name}`}
  size="xl"
>
      <p className="mb-4 text-sm text-gray-600">
        Record the actual remaining quantities for each batch based on your physical count.
      </p>
      <form onSubmit={handleEndDayUpdate}>
        <div className="space-y-4">
          {endDayQuantities.map((batch, index) => (
            <div key={index} className="p-3 border rounded" style={{ borderColor: colors.muted }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Batch #{index + 1}</span>
                <span className="text-sm text-gray-500">Expires: {batch.expirationDate}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-grow">
                  <label className="block text-sm mb-1">End-of-Day Quantity</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step={selectedItemForEndDay.unit === 'kilograms' || selectedItemForEndDay.unit === 'liters' ? '0.1' : '1'}
                    value={batch.quantity}
                    onChange={(e) => {
                      const newQuantities = [...endDayQuantities];
                      newQuantities[index].quantity = e.target.value;
                      setEndDayQuantities(newQuantities);
                    }}
                    className="w-full p-2 border rounded"
                    style={{ borderColor: colors.muted }}
                  />
                </div>
                <div className="text-sm text-gray-600 pt-6">
                  {selectedItemForEndDay.unit}
                </div>
              </div>
            </div>
          ))}
        </div>        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            onClick={() => setShowDailyInventoryModal(false)}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
          >
            Save End-of-Day Count
          </Button>
        </div>
      </form>
</Modal>

{/* Unit Conversion Modal */}
<Modal
  isOpen={showConversionModal}
  onClose={() => setShowConversionModal(false)}
  title="Unit Conversion"
  size="md"
>
      <form onSubmit={handleConversion}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Value</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={conversionData.value}
              onChange={(e) => setConversionData({...conversionData, value: e.target.value})}
              className="w-full p-2 border rounded"
              style={{ borderColor: colors.muted }}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">From Unit</label>
              <select
                required
                value={conversionData.fromUnit}
                onChange={(e) => setConversionData({...conversionData, fromUnit: e.target.value})}
                className="w-full p-2 border rounded"
                style={{ borderColor: colors.muted }}
              >
                <option value="grams">Grams</option>
                <option value="kilograms">Kilograms</option>
                <option value="milliliters">Milliliters</option>
                <option value="liters">Liters</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm mb-1">To Unit</label>
              <select
                required
                value={conversionData.toUnit}
                onChange={(e) => setConversionData({...conversionData, toUnit: e.target.value})}
                className="w-full p-2 border rounded"
                style={{ borderColor: colors.muted }}
              >
                <option value="grams">Grams</option>
                <option value="kilograms">Kilograms</option>
                <option value="milliliters">Milliliters</option>
                <option value="liters">Liters</option>
              </select>
            </div>
          </div>
          
          {conversionResult && (
            <div className="mt-4 p-3 rounded" style={{ backgroundColor: colors.activeBg }}>
              <p className="font-medium" style={{ color: colors.primary }}>
                {conversionResult.originalValue} {conversionResult.originalUnit} = 
                <span className="text-lg ml-2" style={{ color: colors.accent }}>
                  {conversionResult.convertedValue} {conversionResult.convertedUnit}
                </span>
              </p>
            </div>
          )}
        </div>
          <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            onClick={() => setShowConversionModal(false)}
            variant="secondary"
          >
            Close
          </Button>
          <Button
            type="submit"
            variant="primary"
          >
            Convert
          </Button>
        </div>
      </form>
</Modal>

{/* Bulk End-of-Day Inventory Modal */}
<Modal
  isOpen={showBulkEndDayModal}
  onClose={() => setShowBulkEndDayModal(false)}
  title="Bulk End-of-Day Inventory Count"
  size="4xl"
>
      <p className="mb-4 text-sm text-gray-600">
        Record the actual remaining quantities for all items in one go based on your physical count.
      </p>
      
      <form onSubmit={handleBulkEndDayUpdate}>
        <div className="space-y-6">
          {bulkEndDayQuantities.map((item, itemIndex) => (
            <div key={item.itemId} className="p-4 border rounded" style={{ borderColor: colors.muted }}>
              <h3 className="font-medium mb-2" style={{ color: colors.primary }}>
                {item.name}
              </h3>
              
              <div className="space-y-3">
                {item.endQuantities.map((batch, batchIndex) => (
                  <div key={batch.batchId} className="p-3 border rounded bg-gray-50" style={{ borderColor: colors.muted }}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Batch #{batchIndex + 1}</span>
                      <span className="text-sm text-gray-500">Expires: {batch.expirationDate}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-grow">
                        <label className="block text-sm mb-1">End-of-Day Quantity</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step={item.unit === 'kilograms' || item.unit === 'liters' ? '0.1' : '1'}
                          value={batch.quantity}
                          onChange={(e) => updateBulkEndDayQuantity(itemIndex, batchIndex, e.target.value)}
                          className="w-full p-2 border rounded"
                          style={{ borderColor: colors.muted }}
                        />
                      </div>
                      <div className="text-sm text-gray-600 pt-6">
                        {item.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>          <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            onClick={() => setShowBulkEndDayModal(false)}
            variant="secondary"
            disabled={bulkOperationLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={bulkOperationLoading}
            isLoading={bulkOperationLoading}
          >
            Save All End-of-Day Counts
          </Button>
        </div>
      </form>
</Modal>

        {showReports && (
          <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white p-6 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>Inventory Analytics</h2>
                <button
                  onClick={() => setShowReports(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Summary Statistics */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>Inventory Summary</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
                    <div className="text-sm" style={{ color: colors.muted }}>Total Items</div>
                    <div className="text-2xl font-bold" style={{ color: colors.primary }}>
                      {items.length}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
                    <div className="text-sm" style={{ color: colors.muted }}>Total Quantity</div>
                    <div className="text-2xl font-bold" style={{ color: colors.primary }}>
                      {items.reduce((sum, item) => sum + (item.totalQuantity || 0), 0).toFixed(0)}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
                    <div className="text-sm" style={{ color: colors.muted }}>Low Stock</div>
                    <div className="text-2xl font-bold" style={{ color: colors.accent }}>
                      {items.filter(item => item.status === 'Low Stock').length}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4" style={{ borderColor: colors.muted + '40' }}>
                    <div className="text-sm" style={{ color: colors.muted }}>Out of Stock</div>
                    <div className="text-2xl font-bold" style={{ color: '#ef4444' }}>
                      {items.filter(item => item.status === 'Out of Stock').length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory Table */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: colors.primary }}>Current Inventory</h3>
                <div className="overflow-x-auto border rounded-lg" style={{ borderColor: colors.muted + '40' }}>
                  <table className="w-full text-sm">
                    <thead style={{ backgroundColor: colors.primary, color: 'white' }}>
                      <tr>
                        <th className="px-4 py-3 text-left">Item Name</th>
                        <th className="px-4 py-3 text-left">Category</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-center">Quantity</th>
                        <th className="px-4 py-3 text-center">Unit</th>
                        <th className="px-4 py-3 text-right">Cost</th>
                        <th className="px-4 py-3 text-right">Unit Cost</th>
                        <th className="px-4 py-3 text-left">Vendor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => {
                        const batches = item.inventory || item.batches || [];
                        const totalPurchasedCost = (batches || []).reduce(
                          (sum, batch) => sum + (batch.batchCost || batch.cost || 0),
                          0
                        );
                        const totalPurchasedQty = (batches || []).reduce(
                          (sum, batch) => sum + (batch.purchasedQuantity ?? batch.quantity ?? 0),
                          0
                        );
                        const unitCost =
                          (typeof item.unitPrice === 'number' && Number.isFinite(item.unitPrice))
                            ? item.unitPrice
                            : (totalPurchasedQty > 0 ? totalPurchasedCost / totalPurchasedQty : (item.price || 0));

                        const quantity = item.totalQuantity || 0;
                        const isWholeUnit = item.unit === 'pieces' || item.unit === 'grams' || item.unit === 'milliliters';
                        
                        return (
                          <tr 
                            key={item._id || index}
                            style={{ 
                              backgroundColor: index % 2 === 0 ? 'white' : colors.muted + '10',
                              borderBottom: `1px solid ${colors.muted}40`
                            }}
                          >
                            <td className="px-4 py-3 font-medium">{item.name}</td>
                            <td className="px-4 py-3">{item.category || 'N/A'}</td>
                            <td className="px-4 py-3 text-center">
                              <span 
                                className="px-3 py-1 rounded-full text-xs font-medium"
                                style={{
                                  backgroundColor: 
                                    item.status === 'Out of Stock' ? '#fee2e2' :
                                    item.status === 'Low Stock' ? '#fef3c7' :
                                    '#d1fae5',
                                  color:
                                    item.status === 'Out of Stock' ? '#dc2626' :
                                    item.status === 'Low Stock' ? '#d97706' :
                                    '#059669'
                                }}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">{isWholeUnit ? Number(quantity).toFixed(0) : Number(quantity).toFixed(2)}</td>
                            <td className="px-4 py-3 text-center">{item.unit || 'N/A'}</td>
                            <td className="px-4 py-3 text-right font-medium">₱{Number(totalPurchasedCost || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-medium">₱{Number(unitCost || 0).toFixed(2)}</td>
                            <td className="px-4 py-3">{item.vendor || 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot style={{ backgroundColor: colors.muted + '20', fontWeight: 'bold' }}>
                      <tr>
                        <td colSpan="7" className="px-4 py-3 text-right">Total Purchase Cost:</td>
                        <td className="px-4 py-3 text-right" style={{ color: colors.primary }}>
                          ₱{items.reduce((sum, item) => {
                            const batches = item.inventory || item.batches || [];
                            const itemCost = (batches || []).reduce((batchSum, batch) => batchSum + (batch.batchCost || batch.cost || 0), 0);
                            return sum + itemCost;
                          }, 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  onClick={handleDownloadInventoryPDF}
                  variant="accent"
                >
                  Download PDF Report (with Charts)
                </Button>
                <Button
                  onClick={() => setShowReports(false)}
                  variant="secondary"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden printable report for PDF generation */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <PrintableInventoryReport 
            ref={printableReportRef}
            items={items}
            alerts={alerts}
            reportDate={new Date()}
          />
        </div>

        {showAuditLog && (
          <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
            <div className="bg-white p-6 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold" style={{ color: colors.primary }}>Audit Log</h2>
                <button
                  onClick={() => setShowAuditLog(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0" style={{ backgroundColor: colors.primary, color: 'white' }}>
                    <tr>
                      <th className="px-3 py-3 text-left">Timestamp</th>
                      <th className="px-3 py-3 text-left">Action</th>
                      <th className="px-3 py-3 text-left">Description</th>
                      <th className="px-3 py-3 text-left">Item</th>
                      <th className="px-3 py-3 text-left">User</th>
                      <th className="px-3 py-3 text-left">Batch ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLog.length > 0 ? (
                      auditLog.slice().reverse().map((log, index) => (
                        <tr 
                          key={log._id || log.id || index} 
                          className="border-t"
                          style={{ backgroundColor: index % 2 === 0 ? 'white' : colors.muted + '10' }}
                        >
                          <td className="px-3 py-3 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              log.action === 'restock' ? 'bg-green-100 text-green-800' :
                              log.action === 'add_item' ? 'bg-blue-100 text-blue-800' :
                              log.action === 'delete_item' ? 'bg-red-100 text-red-800' :
                              log.action === 'edit_item' ? 'bg-yellow-100 text-yellow-800' :
                              log.action === 'consumption' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {log.action?.replace('_', ' ').toUpperCase() || 'OTHER'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm max-w-xs truncate" title={log.description}>
                            {log.description || log.action}
                          </td>
                          <td className="px-3 py-3 text-sm">
                            {log.itemName || (log.itemId ? log.itemId.substring(0, 8) + '...' : '-')}
                          </td>
                          <td className="px-3 py-3 text-sm">{log.user}</td>
                          <td className="px-3 py-3 font-mono text-xs">
                            {log.batchId ? log.batchId.substring(0, 8) + '...' : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                          No audit log entries yet. Actions will appear here as you perform inventory operations.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 pt-4 border-t flex justify-end">
                <Button
                  onClick={() => setShowAuditLog(false)}
                  variant="secondary"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Reservations Modal */}
        <Modal
          isOpen={showReservationsModal}
          onClose={() => setShowReservationsModal(false)}
          title="Inventory Reservations"
          size="5xl"
          footer={
             <div className="flex justify-end gap-2">
                <Button onClick={() => setShowReservationsModal(false)} variant="primary">
                  Close
                </Button>
              </div>
          }
        >
              <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mt-1">
                      Track ingredients reserved for pending orders
                    </p>
                  </div>
              
              {/* Summary Stats */}
              {inventoryReservations.length > 0 && (
                <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {inventoryReservations.filter(r => r.status === 'reserved').length}
                    </div>
                    <div className="text-xs text-yellow-600 font-medium">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {inventoryReservations.filter(r => r.status === 'consumed').length}
                    </div>
                    <div className="text-xs text-green-600 font-medium">Consumed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {inventoryReservations.filter(r => r.status === 'released').length}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Released</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {inventoryReservations.length}
                    </div>
                    <div className="text-xs text-blue-600 font-medium">Total</div>
                  </div>
                </div>
              )}
              
              <div className="flex-1 overflow-y-auto">
                {inventoryReservations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Order #</th>
                          <th className="px-4 py-2 text-left">Ingredients Reserved</th>
                          <th className="px-4 py-2 text-left">Status</th>
                          <th className="px-4 py-2 text-left">Created</th>
                          <th className="px-4 py-2 text-left">Expires</th>
                          <th className="px-4 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryReservations.map((reservation) => (
                          <tr key={reservation._id} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">
                              {reservation.orderNumber || `Order ${String(reservation.orderId).substring(0, 8)}`}
                            </td>
                            <td className="px-4 py-3">
                              {reservation.items && reservation.items.length > 0 ? (
                                <div className="space-y-1">
                                  {reservation.items.map((item, index) => (
                                    <div key={index} className="text-sm">
                                      <span className="font-medium">{item.ingredientName || 'Unknown'}</span>
                                      {' '}- {item.quantity} {item.unit}
                                      {item.status && item.status !== 'reserved' && (
                                        <span className="ml-2 text-xs text-gray-500">({item.status})</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">No items</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                reservation.status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
                                reservation.status === 'consumed' ? 'bg-green-100 text-green-800' :
                                reservation.status === 'released' ? 'bg-gray-100 text-gray-800' :
                                reservation.status === 'expired' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {reservation.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(reservation.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {reservation.expiresAt ? (
                                <>
                                  {new Date(reservation.expiresAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                  {new Date(reservation.expiresAt) < new Date() && (
                                    <span className="ml-1 text-red-600 font-medium">(Expired)</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {reservation.status === 'reserved' && (
                                  <Button 
                                    onClick={() => cancelReservation(reservation.reservationId)}
                                    variant="ghost"
                                    size="sm"
                                    title="Release this reservation"
                                  >
                                    Release
                                  </Button>
                                )}
                                {(reservation.status === 'consumed' || reservation.status === 'released') && (
                                  <span className="text-xs text-gray-400 italic">No actions</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No inventory reservations found
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-between">
                <Button 
                  onClick={fetchInventoryReservations} 
                  variant="secondary"
                  disabled={isRefreshThrottled}
                  title={isRefreshThrottled ? "Please wait 5 seconds between refreshes" : "Refresh reservations"}
                >
                  {isRefreshThrottled ? "Refreshing..." : "Refresh"}
                </Button>
              </div>
            </div>
</Modal>


      </div>
    </div>
  );
};

export default InventorySystem;