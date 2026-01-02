import { useState, useEffect, useRef } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { FiTrendingUp, FiTrendingDown, FiShoppingBag, FiClock, FiUsers, FiDownload, FiFileText, FiPrinter } from 'react-icons/fi';
import { PesoIconSimple } from './ui/PesoIconSimple';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { theme } from '../theme';
import BrandedLoadingScreen from './ui/BrandedLoadingScreen';
import { PrintableRevenueReport } from './ui/PrintableRevenueReport';
import { generateRevenuePDF } from '../utils/pdfGenerator';
import { businessDateKey } from '../utils/businessDate';

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b',
  activeBg: '#f1670f20'
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const RevenueReports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [revenueData, setRevenueData] = useState(null);
  const [monthlyHistoricalData, setMonthlyHistoricalData] = useState([]);
  const [yearlyHistoricalData, setYearlyHistoricalData] = useState([]);
  const [allTimeTopItems, setAllTimeTopItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
    // Ref for printable report
  const printableReportRef = useRef(null);
  
  // Print handler for browser print
  const handlePrint = useReactToPrint({
    content: () => printableReportRef.current,
    documentTitle: `Revenue Report - ${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} - ${new Date().toLocaleDateString()}`,
  });
  // Download PDF handler (using text-based PDF generation)
  const handleDownloadPDF = () => {
    try {
      generateRevenuePDF(revenueData, selectedPeriod);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };  // Alternative download with charts (html2canvas method)
  const handleDownloadPDFWithCharts = async () => {
    if (!printableReportRef.current || !revenueData) {
      alert('Report data not available. Please wait for data to load.');
      return;
    }

    try {
      // Get the element to convert
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
      element.style.left = '0px';
      element.style.top = '0px';
      element.style.zIndex = '9999';
      element.style.width = '800px';
      element.style.height = 'auto';
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      element.style.backgroundColor = 'white';
      
      // Force layout recalculation
      element.offsetHeight;
      
      // Wait for any dynamic content (charts) to render
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get actual height after rendering
      const actualHeight = element.scrollHeight;
      console.log('Element dimensions before capture:', element.offsetWidth, 'x', actualHeight);
      
      if (actualHeight === 0) {
        throw new Error('Element has no height - content may not be rendering properly');
      }
      
      // Convert HTML to canvas with specific options for Recharts
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: true,
        width: 800,
        height: actualHeight,
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: false, // Disable for better SVG compatibility
        imageTimeout: 30000,
        onclone: (clonedDoc) => {
          // Process SVG elements in the cloned document
          const svgElements = clonedDoc.querySelectorAll('svg');
          svgElements.forEach(svg => {
            svg.style.backgroundColor = 'white';
            svg.style.overflow = 'visible';
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            
            // Make sure all SVG text is black and visible
            const textElements = svg.querySelectorAll('text, tspan');
            textElements.forEach(text => {
              text.style.fill = '#000000';
              text.style.fontSize = '12px';
              text.setAttribute('fill', '#000000');
            });
            
            // Make sure all paths and shapes are visible
            const shapes = svg.querySelectorAll('path, rect, circle, line');
            shapes.forEach(shape => {
              if (shape.style.opacity === '0') {
                shape.style.opacity = '1';
              }
            });
          });
          
          // Ensure all other text is visible
          const allText = clonedDoc.querySelectorAll('*');
          allText.forEach(el => {
            if (el.style.color === 'transparent' || el.style.opacity === '0') {
              el.style.color = '#000000';
              el.style.opacity = '1';
            }
          });
        }
      });      
      // Restore original styles
      Object.keys(originalStyles).forEach(key => {
        element.style[key] = originalStyles[key];
      });
      
      // Validate canvas
      console.log('Canvas dimensions after capture:', canvas ? `${canvas.width}x${canvas.height}` : 'null');
      
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Failed to capture content. Canvas is empty or invalid.');
      }
      
      // Additional validation for canvas data
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context.');
      }
      
      // Check if canvas has actual content by sampling pixels
      const imageData = context.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
      const hasContent = Array.from(imageData.data).some((pixel, index) => {
        // Check if any non-white, non-transparent pixels exist
        if (index % 4 === 3) return false; // Skip alpha channel
        return pixel !== 255 && pixel !== 0;
      });
      
      if (!hasContent) {
        console.warn('Canvas appears to be mostly blank, but proceeding with PDF generation');
      }
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Convert to high-quality JPEG
      let imgData;
      try {
        imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        if (!imgData || imgData === 'data:,' || imgData.length < 1000) {
          throw new Error('Generated image data is invalid or too small.');
        }
      } catch (canvasError) {
        console.error('Canvas conversion error:', canvasError);
        throw new Error('Failed to convert canvas to image. The content may be too complex.');
      }
      
      // Calculate dimensions to fit A4
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
        // Add image to PDF with error handling
      try {
        // Add first page
        if (imgHeight <= pageHeight) {
          // Single page
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        } else {
          // Multiple pages
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          
          // Add additional pages if needed
          while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }
        }
      } catch (pdfError) {
        console.error('PDF creation error:', pdfError);
        throw new Error('Failed to create PDF. The image may be corrupted or too large.');
      }
      
      // Generate filename
      const fileName = `Revenue_Report_With_Charts_${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}_${businessDateKey(new Date())}.pdf`;
      
      // Save the PDF with error handling
      try {
        pdf.save(fileName);
      } catch (saveError) {
        console.error('PDF save error:', saveError);
        throw new Error('Failed to save PDF file. Please check your browser permissions.');
      }
        } catch (error) {
      console.error('Error generating PDF with charts:', error);
      
      // Fallback: Try with simpler canvas options
      if (error.message.includes('Canvas is empty') || error.message.includes('invalid')) {
        console.log('Attempting fallback PDF generation...');
        try {
          await handleDownloadPDFWithChartsFallback();
          return;
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
        }
      }
      
      alert(`Failed to generate PDF with charts: ${error.message}. Please try the regular PDF download instead.`);
    }
  };

  // Fallback method for PDF with charts
  const handleDownloadPDFWithChartsFallback = async () => {
    const element = printableReportRef.current;
    if (!element) return;

    // Much simpler approach - just capture the visible element
    element.style.display = 'block';
    element.style.position = 'relative';
    element.style.width = '800px';
    element.style.backgroundColor = 'white';
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait longer
    
    const canvas = await html2canvas(element, {
      scale: 1,
      useCORS: true,
      allowTaint: true, // Allow tainted canvas
      backgroundColor: '#ffffff',
      logging: false,
      width: 800,
      height: element.scrollHeight
    });
    
    element.style.display = 'none'; // Hide again
    
    if (canvas && canvas.width > 0 && canvas.height > 0) {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png', 0.8);
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const fileName = `Revenue_Report_Charts_Fallback_${selectedPeriod}_${businessDateKey(new Date())}.pdf`;
      pdf.save(fileName);
    } else {
      throw new Error('Fallback method also failed to capture content');
    }
  };

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/revenue/${selectedPeriod}`);
        const data = await response.json();
        if (data.success) {
          setRevenueData(data.data);
        } else {
          throw new Error(data.error || 'Failed to fetch revenue data');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, [selectedPeriod]);
  // Fetch historical monthly data separately (only once when component mounts)
  useEffect(() => {
    const fetchMonthlyHistoricalData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/revenue/historical/monthly`);
        const data = await response.json();
        if (data.success) {
          setMonthlyHistoricalData(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch monthly historical data:', err);
        // Fallback to empty array if historical data fails
        setMonthlyHistoricalData([]);
      }
    };

    const fetchAllTimeTopItems = async () => {
      try {
        const response = await fetch(`${API_URL}/api/revenue/top-items/all-time`);
        const data = await response.json();
        if (data.success) {
          setAllTimeTopItems(data.data.topItems);
        }
      } catch (err) {
        console.error('Error fetching all-time top items:', err);
      }
    };

    fetchMonthlyHistoricalData();
    const fetchYearlyHistoricalData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/revenue/historical/yearly`);
        const data = await response.json();
        if (data.success) {
          setYearlyHistoricalData(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch yearly historical data:', err);
        setYearlyHistoricalData([]);
      }
    };

    fetchYearlyHistoricalData();
    fetchAllTimeTopItems();
  }, []);

  if (loading) {
    return <BrandedLoadingScreen message="Loading revenue reports..." />;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(value);
  };
  const prepareHourlyData = () => {
    if (!revenueData?.hourlyDistribution) return [];
    return Array.from({ length: 24 }, (_, hour) => ({
      hour: hour.toString().padStart(2, '0') + ':00',
      revenue: revenueData.hourlyDistribution[hour] || 0
    }));
  };  const prepareMonthlyRevenueData = () => {
    // Return real historical data from backend
    return monthlyHistoricalData;
  };

  const prepareWeeklyData = () => {
    if (!revenueData?.weeklyBreakdown) return [];
    return revenueData.weeklyBreakdown.map(d => ({
      label: d.label || d.date,
      revenue: d.revenue || 0,
      orders: d.orders || 0
    }));
  };

  const prepareOrderSourceData = () => {
    if (!revenueData?.revenueBySource) return [];
    return Object.entries(revenueData.revenueBySource).map(([source, amount]) => ({
      name: source === 'self_checkout' ? 'Self Checkout' : 
            source === 'chatbot' ? 'Chatbot' : 
            source === 'pos' ? 'POS' : source,
      value: amount,
      percentage: ((amount / revenueData.summary.totalRevenue) * 100).toFixed(1)
    }));
  };

  // Custom chart colors for pie charts
  const CHART_COLORS = [colors.accent, colors.secondary, colors.primary, '#60a5fa', '#34d399', '#fbbf24'];

  // Metric card component
  const MetricCard = ({ title, value, icon: Icon, trend, trendValue, className = '' }) => (
    <div className={`bg-white rounded-lg border p-4 ${className}`} 
         style={{ borderColor: colors.muted + '20' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ backgroundColor: colors.activeBg }}>
            <Icon className="w-4 h-4" style={{ color: colors.accent }} />
          </div>
          <span className="text-sm font-medium" style={{ color: colors.muted }}>
            {title}
          </span>
        </div>
        {trend && (
          <div className="flex items-center gap-1">
            {trend === 'up' ? (
              <FiTrendingUp className="w-3 h-3" style={{ color: colors.success }} />
            ) : (
              <FiTrendingDown className="w-3 h-3" style={{ color: colors.error }} />
            )}
            <span className="text-xs font-medium"
                  style={{ color: trend === 'up' ? colors.success : colors.error }}>
              {trendValue}%
            </span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold" style={{ color: colors.primary }}>
        {value}
      </div>
    </div>
  );  return (
    <div className="p-6 space-y-6">
      {/* Period Selection and Export - Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {['daily', 'weekly', 'monthly', 'yearly'].map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPeriod === period 
                  ? 'text-white shadow-md' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              style={selectedPeriod === period ? { backgroundColor: colors.accent } : {}}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>        {/* Export Buttons */}
        {revenueData && (
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.accent }}
              title="Download PDF Report (Text-based)"
            >
              <FiDownload className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={handleDownloadPDFWithCharts}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.primary }}
              title="Download PDF with Charts"
            >
              <FiFileText className="w-4 h-4" />
              PDF + Charts
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.secondary }}
              title="Print Report"
            >
              <FiPrinter className="w-4 h-4" />
              Print
            </button>
          </div>
        )}
      </div>

      {revenueData && (
        <>
          {/* Summary Metrics - Compact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">            <MetricCard
              title="Total Revenue"
              value={formatCurrency(revenueData.summary.totalRevenue)}
              icon={PesoIconSimple}
              trend="up"
              trendValue="12.5"
            />
            <MetricCard
              title="Orders"
              value={revenueData.summary.orderCount}
              icon={FiShoppingBag}
              trend="up"
              trendValue="8.2"
            />
            <MetricCard
              title="Items Sold"
              value={revenueData.summary.itemsSold}
              icon={FiUsers}
              trend="down"
              trendValue="2.1"
            />
            <MetricCard
              title="Avg Order"
              value={formatCurrency(revenueData.summary.averageOrderValue)}
              icon={FiClock}
              trend="up"
              trendValue="5.7"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Hourly Revenue Chart - Only for daily */}
            {selectedPeriod === 'daily' && (
              <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
                    Hourly Revenue
                  </h3>
                  <div className="text-sm" style={{ color: colors.muted }}>
                    Today's Performance
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={prepareHourlyData()}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={colors.accent} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={colors.accent} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.muted + '30'} />
                      <XAxis 
                        dataKey="hour" 
                        tick={{ fontSize: 12 }}
                        stroke={colors.muted}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value).replace('PHP', '₱')}
                        tick={{ fontSize: 12 }}
                        stroke={colors.muted}
                      />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value), 'Revenue']}
                        contentStyle={{ 
                          backgroundColor: colors.background,
                          border: `1px solid ${colors.muted}40`,
                          borderRadius: '8px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={colors.accent}
                        strokeWidth={2}
                        fill="url(#revenueGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}            {/* Monthly Revenue Trend */}
            {selectedPeriod !== 'daily' && (
            <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
                  {selectedPeriod === 'monthly' ? 'Monthly Revenue Trend' : selectedPeriod === 'weekly' ? 'Weekly Revenue Trend' : selectedPeriod === 'yearly' ? 'Yearly Revenue Trend' : 'Monthly Revenue Trend'}
                </h3>
                <div className="text-sm" style={{ color: colors.muted }}>
                  {selectedPeriod === 'monthly' ? 'Last 12 Months' : selectedPeriod === 'weekly' ? 'Last 7 Days' : selectedPeriod === 'yearly' ? `Last ${yearlyHistoricalData.length || 5} Years` : 'Last 12 Months'}
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  {selectedPeriod === 'weekly' ? (
                    // Weekly area + line chart (distinct visual from monthly/yearly)
                    <AreaChart data={prepareWeeklyData()}>
                      <defs>
                        <linearGradient id="weeklyGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS[2]} stopOpacity={0.4}/>
                          <stop offset="95%" stopColor={CHART_COLORS[2]} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.muted + '30'} />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke={colors.muted} />
                      <YAxis tickFormatter={(value) => formatCurrency(value).replace('PHP', '₱')} tick={{ fontSize: 12 }} stroke={colors.muted} />
                      <Tooltip formatter={(value, name) => [formatCurrency(value), 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS[2]} strokeWidth={2.5} fill="url(#weeklyGradient)" />
                      <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} />
                    </AreaChart>
                  ) : selectedPeriod === 'yearly' ? (
                    <LineChart data={yearlyHistoricalData.map(y=>({ year: String(y.year), revenue: y.revenue }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.muted + '30'} />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke={colors.muted} />
                      <YAxis tickFormatter={(value) => formatCurrency(value).replace('PHP', '₱')} tick={{ fontSize: 12 }} stroke={colors.muted} />
                      <Tooltip formatter={(value, name) => [formatCurrency(value), 'Revenue']} />
                      <Line type="monotone" dataKey="revenue" stroke={colors.secondary} strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  ) : (
                    <LineChart data={prepareMonthlyRevenueData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke={colors.muted + '30'} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        stroke={colors.muted}
                      />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value).replace('PHP', '₱')}
                        tick={{ fontSize: 12 }}
                        stroke={colors.muted}
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'revenue' ? formatCurrency(value) : value,
                          name === 'revenue' ? 'Revenue' : 'Orders'
                        ]}
                        labelFormatter={(label) => `Month: ${label}`}
                        contentStyle={{ 
                          backgroundColor: colors.background,
                          border: `1px solid ${colors.muted}40`,
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={colors.accent}
                        strokeWidth={3}
                        dot={{ fill: colors.accent, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: colors.accent, strokeWidth: 2, fill: colors.background }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>              {/* Monthly trend summary */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                              {/* Yearly view - show breakdown for selected year */}
                              {selectedPeriod === 'yearly' && yearlyHistoricalData.length > 0 && (
                                <div className="p-6">
                                  <h3 className="text-lg font-semibold mb-2">Yearly trend</h3>
                                  <ResponsiveContainer width="100%" height={240}>
                                    <LineChart data={yearlyHistoricalData.map(y=>({year: String(y.year), revenue: y.revenue}))}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="year" />
                                      <YAxis />
                                      <Tooltip formatter={(v)=>formatCurrency(v)} />
                                      <Line dataKey="revenue" stroke={CHART_COLORS[1]} strokeWidth={3} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                              {selectedPeriod === 'yearly' && revenueData?.monthlyBreakdown && (
                                <div className="p-6">
                                  <h3 className="text-lg font-semibold mb-2">Monthly breakdown — this year</h3>
                                  <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={revenueData.monthlyBreakdown.map(m=>({name: m.month, revenue: m.revenue}))}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" />
                                      <YAxis />
                                      <Tooltip formatter={(v)=>formatCurrency(v)} />
                                      <Bar dataKey="revenue" fill={CHART_COLORS[0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                {selectedPeriod === 'weekly' ? (
                  // Weekly-specific quick metrics
                  <>
                    <div className="text-center">
                      <div className="text-sm" style={{ color: colors.muted }}>Total this week</div>
                      <div className="text-lg font-semibold" style={{ color: colors.primary }}>
                        {formatCurrency((revenueData?.weeklyBreakdown || []).reduce((s, d) => s + (d.revenue || 0), 0))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm" style={{ color: colors.muted }}>Avg daily</div>
                      <div className="text-lg font-semibold" style={{ color: colors.primary }}>
                        {(() => {
                          const days = (revenueData?.weeklyBreakdown || []).length || 7;
                          const total = (revenueData?.weeklyBreakdown || []).reduce((s, d) => s + (d.revenue || 0), 0);
                          return formatCurrency(Math.round((total / days) * 100) / 100);
                        })()}
                      </div>
                    </div>
                  </>
                ) : (
                  // Default: monthly quick metrics
                  <>
                    <div className="text-center">
                      <div className="text-sm" style={{ color: colors.muted }}>Avg Monthly</div>
                      <div className="text-lg font-semibold" style={{ color: colors.primary }}>
                        {monthlyHistoricalData.length > 0 
                          ? formatCurrency(monthlyHistoricalData.reduce((sum, month) => sum + month.revenue, 0) / monthlyHistoricalData.length)
                          : formatCurrency(0)
                        }
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm" style={{ color: colors.muted }}>Growth Trend</div>
                      <div className="text-lg font-semibold flex items-center justify-center gap-1" style={{ color: colors.accent }}>
                        <FiTrendingUp className="w-4 h-4" />
                        {monthlyHistoricalData.length >= 2 ? (
                          `${(((monthlyHistoricalData[monthlyHistoricalData.length - 1]?.revenue || 0) - 
                               (monthlyHistoricalData[monthlyHistoricalData.length - 2]?.revenue || 0)) / 
                               (monthlyHistoricalData[monthlyHistoricalData.length - 2]?.revenue || 1) * 100).toFixed(1)}%`
                        ) : '+0.0%'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
            )}

            {/* Top Items - Minimalist List (moved into right container where Order Sources was) */}
            <div className="bg-white rounded-lg border p-6" style={{ borderColor: colors.muted + '20' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
                  Top Items
                </h3>
                <div className="text-sm" style={{ color: colors.muted }}>
                  Best Sellers
                </div>
              </div>
              <div className="space-y-3">
                {revenueData.topItems.slice(0, 5).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: index < 3 ? colors.accent : colors.muted }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm" style={{ color: colors.primary }}>
                          {item.name}
                        </div>
                        <div className="text-xs" style={{ color: colors.muted }}>
                          {item.quantity} sold
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm" style={{ color: colors.primary }}>
                        {formatCurrency(item.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            
          </div>
        </>
      )}        {/* Hidden Printable Report - positioned off-screen but still rendered */}
      <div style={{ 
        position: 'fixed',
        left: '-9999px',
        top: '0px',
        zIndex: '-1000',
        width: '800px',
        backgroundColor: 'white',
        overflow: 'hidden'
      }}>
        {revenueData && (
          <PrintableRevenueReport
            ref={printableReportRef}
            revenueData={revenueData}
            selectedPeriod={selectedPeriod}
            reportDate={new Date()}
          />
        )}
      </div>
    </div>
  );
};

export default RevenueReports;