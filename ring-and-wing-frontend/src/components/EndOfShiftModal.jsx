import React, { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Modal } from './ui/Modal';
import { PrintableRevenueReport } from './ui/PrintableRevenueReport';
import { generateRevenuePDF } from '../utils/pdfGenerator';
import { useCashFloat } from '../hooks/useCashFloat';
import { FiPrinter, FiDownload, FiFileText, FiDollarSign, FiAlertCircle } from 'react-icons/fi';

const EndOfShiftModal = ({ isOpen, onClose, theme, cashFloat }) => {
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actualCashCount, setActualCashCount] = useState('');
  const [cashReconciliation, setCashReconciliation] = useState(null);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const printableReportRef = useRef();
  
  // Use cash float hook to get the correct starting float for today
  const { getTodaysStartingFloat, formatCurrency: formatCash } = useCashFloat();

  const handlePrint = useReactToPrint({
    content: () => printableReportRef.current,
  });

  // Fetch daily revenue data
  const fetchDailyRevenueData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = (window.API_CONFIG?.apiUrl || window.location.origin).replace(/\/$/, '');
      const response = await fetch(`${apiUrl}/api/revenue/daily`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch revenue data');
      }
      
      const response_data = await response.json();
      const data = response_data.data; // Extract the actual data from the API response
      setRevenueData(data);
      
      // Calculate expected cash for reconciliation
      if (data && data.summary) {
        calculateCashReconciliation(data);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching revenue data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate cash reconciliation
  const calculateCashReconciliation = async (data) => {
    try {
      // Get today's starting float using the service
      const startingFloat = await getTodaysStartingFloat();
        // Calculate expected cash (starting float + cash payments)
      // revenueByPayment is an object, not an array
      const cashPayments = data.revenueByPayment?.cash || 0;
      
      const expectedCash = startingFloat + cashPayments;
      
      setCashReconciliation({
        startingFloat,
        cashPayments,
        expectedCash,
        actualCash: parseFloat(actualCashCount) || 0,
        difference: (parseFloat(actualCashCount) || 0) - expectedCash
      });
    } catch (error) {
      console.error('Error calculating cash reconciliation:', error);
    }
  };

  // Handle actual cash count change
  const handleActualCashChange = (value) => {
    setActualCashCount(value);
    if (revenueData && value) {
      calculateCashReconciliation(revenueData);
    }
  };

  // Handle PDF download (text only)
  const handleDownloadPDF = () => {
    if (revenueData) {
      generateRevenuePDF(revenueData, 'daily', new Date());
    }
  };
  // Handle PDF download with charts
  const handleDownloadPDFWithCharts = async () => {
    if (!revenueData || !printableReportRef.current) {
      console.error('No revenue data or report reference available');
      return;
    }

    try {
      const element = printableReportRef.current;
      
      // Store original styles
      const originalStyles = {
        visibility: element.style.visibility,
        opacity: element.style.opacity,
        position: element.style.position,
        left: element.style.left,
        zIndex: element.style.zIndex
      };
      
      // Make element visible for capture but keep it off-screen
      element.style.visibility = 'visible';
      element.style.opacity = '1';
      element.style.position = 'fixed';
      element.style.left = '-9999px';
      element.style.zIndex = '9999';
      
      // Wait for charts to render properly
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify element has content
      if (!element || element.scrollHeight === 0) {
        throw new Error('Report element is not properly rendered');
      }
      
      const canvas = await html2canvas(element, {
        scale: 1.2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        width: 800,
        height: element.scrollHeight,
        logging: true,
        removeContainer: false,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Ensure all elements are visible in the clone
          const clonedElement = clonedDoc.querySelector('#hidden-report-for-pdf');
          if (clonedElement) {
            clonedElement.style.visibility = 'visible';
            clonedElement.style.opacity = '1';
            clonedElement.style.display = 'block';
          }
        }
      });
      
      // Restore original styles
      Object.assign(element.style, originalStyles);
      
      // Validate canvas
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas capture failed - no content captured');
      }
      
      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Convert canvas to high-quality PNG
      const imgData = canvas.toDataURL('image/png', 0.95);
      
      // Validate image data
      if (!imgData || imgData === 'data:,') {
        throw new Error('Canvas to PNG conversion failed');
      }
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page PDF
        let y = 0;
        let remainingHeight = imgHeight;
        
        while (remainingHeight > 0) {
          const pageHeight = Math.min(pdfHeight, remainingHeight);
          const sourceY = y / imgHeight * canvas.height;
          const sourceHeight = pageHeight / imgHeight * canvas.height;
          
          // Create a canvas for this page
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          const pageCtx = pageCanvas.getContext('2d');
          
          pageCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
          
          const pageImgData = pageCanvas.toDataURL('image/png', 0.95);
          
          if (y > 0) {
            pdf.addPage();
          }
          
          pdf.addImage(pageImgData, 'PNG', 0, 0, imgWidth, pageHeight);
          
          y += pageHeight;
          remainingHeight -= pageHeight;
        }
      }
      
      const today = new Date().toISOString().split('T')[0];
      pdf.save(`End_of_Shift_Report_with_Charts_${today}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF with charts:', error);
      alert(`Error generating PDF with charts: ${error.message}`);
    }
  };

  // Format currency helper
  const formatCurrency = (amount) => {
    return `PHP ${parseFloat(amount || 0).toFixed(2)}`;
  };

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchDailyRevenueData();
    }
  }, [isOpen]);

  // Recalculate cash reconciliation when actual cash count changes
  useEffect(() => {
    if (revenueData && actualCashCount) {
      calculateCashReconciliation(revenueData);
    }
  }, [actualCashCount, revenueData]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: theme.colors.primary }}>
            End of Shift Report
          </h2>
          <div className="flex gap-2">
            {revenueData && (
              <>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: theme.colors.accent, color: 'white' }}
                  title="Download PDF (Text Only)"
                >
                  <FiDownload size={16} />
                  PDF
                </button>
                <button
                  onClick={handleDownloadPDFWithCharts}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: theme.colors.secondary, color: 'white' }}
                  title="Download PDF with Charts"
                >
                  <FiFileText size={16} />
                  PDF + Charts
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
                  style={{ backgroundColor: theme.colors.primary, color: 'white' }}
                  title="Print Report"
                >
                  <FiPrinter size={16} />
                  Print
                </button>
              </>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" 
                 style={{ borderColor: theme.colors.accent }}>
            </div>
            <span className="ml-3 text-lg">Loading revenue data...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-lg bg-red-50 border border-red-200">
            <FiAlertCircle className="text-red-500" size={20} />
            <div>
              <p className="font-medium text-red-800">Error Loading Data</p>
              <p className="text-red-600">{error}</p>
            </div>
            <button
              onClick={fetchDailyRevenueData}
              className="ml-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {revenueData && (
          <div className="space-y-6">            {/* Cash Reconciliation Section */}
            <div className="bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 border-2 rounded-xl p-6 shadow-sm" style={{ borderColor: theme.colors.muted }}>
              <div className="flex items-center mb-6">
                <div className="p-2 rounded-lg bg-white shadow-sm border mr-3">
                  <FiDollarSign size={20} style={{ color: theme.colors.accent }} />
                </div>
                <h3 className="text-xl font-bold" style={{ color: theme.colors.primary }}>
                  Cash Reconciliation
                </h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expected Cash Calculation */}
                <div className="bg-white p-5 rounded-lg border shadow-sm" style={{ borderColor: theme.colors.muted }}>
                  <h4 className="font-semibold mb-4 text-gray-700">Expected Cash Calculation</h4>
                  {cashReconciliation ? (
                    <div className="space-y-3 font-mono text-sm">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Starting Float</span>
                        <span className="font-bold">{formatCurrency(cashReconciliation.startingFloat)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">+ Cash Sales</span>
                        <span className="font-bold">{formatCurrency(cashReconciliation.cashPayments)}</span>
                      </div>
                      <div className="border-t-2 pt-3 border-gray-200">
                        <div className="flex justify-between items-center py-2">
                          <span className="font-semibold text-gray-800">= Expected Total</span>
                          <span className="font-bold text-lg" style={{ color: theme.colors.primary }}>
                            {formatCurrency(cashReconciliation.expectedCash)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      Loading calculation...
                    </div>
                  )}
                </div>
                
                {/* Actual Cash Count */}
                <div className="bg-white p-5 rounded-lg border shadow-sm" style={{ borderColor: theme.colors.muted }}>
                  <h4 className="font-semibold mb-4 text-gray-700">Actual Cash Count</h4>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">PHP</span>
                    <input
                      type="number"
                      step="0.01"
                      value={actualCashCount}
                      onChange={(e) => handleActualCashChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 text-lg font-semibold transition-all"
                      style={{ 
                        borderColor: theme.colors.muted,
                        focusRingColor: theme.colors.accent,
                        color: theme.colors.primary
                      }}
                    />
                  </div>
                  
                  {/* Show difference text below input when there's a value */}
                  {actualCashCount && parseFloat(actualCashCount) > 0 && cashReconciliation && (
                    <div className="mt-4 text-center">
                      <div className={`text-lg font-bold ${
                        cashReconciliation.difference === 0 ? 'text-blue-600' :
                        cashReconciliation.difference > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {cashReconciliation.difference >= 0 ? '+' : '-'}{formatCurrency(Math.abs(cashReconciliation.difference))}
                      </div>
                      <div className={`text-xs font-medium uppercase tracking-wider ${
                        cashReconciliation.difference === 0 ? 'text-blue-500' :
                        cashReconciliation.difference > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {cashReconciliation.difference === 0 ? 'Balanced' :
                         cashReconciliation.difference > 0 ? 'Overage' : 'Shortage'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>{/* Revenue Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border rounded-xl p-4" style={{ borderColor: theme.colors.muted }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: theme.colors.primary }}>
                Daily Revenue Summary
              </h3>
              
              {/* Compact Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-white p-3 rounded-lg text-center border shadow-sm">
                  <div className="text-lg font-bold" style={{ color: theme.colors.primary }}>
                    {formatCurrency(revenueData?.summary?.totalRevenue || 0)}
                  </div>
                  <div className="text-xs text-gray-600">Total Revenue</div>
                </div>
                <div className="bg-white p-3 rounded-lg text-center border shadow-sm">
                  <div className="text-lg font-bold" style={{ color: theme.colors.primary }}>
                    {revenueData?.summary?.orderCount || 0}
                  </div>
                  <div className="text-xs text-gray-600">Orders</div>
                </div>
                <div className="bg-white p-3 rounded-lg text-center border shadow-sm">
                  <div className="text-lg font-bold" style={{ color: theme.colors.primary }}>
                    {revenueData?.summary?.itemsSold || 0}
                  </div>
                  <div className="text-xs text-gray-600">Items Sold</div>
                </div>
                <div className="bg-white p-3 rounded-lg text-center border shadow-sm">
                  <div className="text-lg font-bold" style={{ color: theme.colors.primary }}>
                    {formatCurrency(revenueData?.summary?.averageOrderValue || 0)}
                  </div>
                  <div className="text-xs text-gray-600">Avg Order</div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowDetailedReport(!showDetailedReport)}
                  className="px-6 py-2 rounded-lg border-2 hover:opacity-90 transition-colors"
                  style={{ 
                    borderColor: theme.colors.accent,
                    color: theme.colors.accent
                  }}
                >
                  {showDetailedReport ? 'Hide Detailed Report' : 'View Detailed Report'}
                </button>
              </div>
            </div>            {/* Detailed Report - Modal Optimized */}
            {showDetailedReport && (
              <div className="bg-white border rounded-xl shadow-lg" style={{ borderColor: theme.colors.muted }}>
                <div className="p-4 border-b" style={{ borderColor: theme.colors.muted }}>
                  <h4 className="text-lg font-semibold" style={{ color: theme.colors.primary }}>
                    Detailed Revenue Report
                  </h4>
                </div>
                <div className="p-4 max-h-96 overflow-y-auto space-y-4">
                  
                  {/* Payment Methods */}
                  <div>
                    <h5 className="font-semibold mb-3 text-gray-700">Revenue by Payment Method</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {revenueData?.revenueByPayment && Object.entries(revenueData.revenueByPayment).map(([method, amount]) => (
                        <div key={method} className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm text-gray-600 capitalize">{method}</div>
                          <div className="font-bold text-lg" style={{ color: theme.colors.primary }}>
                            {formatCurrency(amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Selling Items */}
                  {revenueData?.topSellingItems && revenueData.topSellingItems.length > 0 && (
                    <div>
                      <h5 className="font-semibold mb-3 text-gray-700">Top Selling Items</h5>
                      <div className="space-y-2">
                        {revenueData.topSellingItems.slice(0, 5).map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium text-sm">{item.name}</div>
                              <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-sm" style={{ color: theme.colors.primary }}>
                                {formatCurrency(item.revenue)}
                              </div>
                              <div className="text-xs text-gray-500">{item.percentage}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hourly Revenue Chart */}
                  {revenueData?.hourlyDistribution && (
                    <div>
                      <h5 className="font-semibold mb-3 text-gray-700">Hourly Revenue Distribution</h5>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="grid grid-cols-6 gap-2 text-xs">
                          {Array.from({ length: 24 }, (_, hour) => {
                            const revenue = revenueData.hourlyDistribution[hour] || 0;
                            const maxRevenue = Math.max(...Object.values(revenueData.hourlyDistribution));
                            const heightPercent = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                            
                            return (
                              <div key={hour} className="text-center">
                                <div 
                                  className="bg-orange-400 rounded-sm mb-1 mx-auto w-4"
                                  style={{ 
                                    height: `${Math.max(heightPercent * 0.4, revenue > 0 ? 8 : 2)}px`,
                                    backgroundColor: revenue > 0 ? theme.colors.accent : '#e5e7eb'
                                  }}
                                  title={`${hour}:00 - ${formatCurrency(revenue)}`}
                                ></div>
                                <div className="text-xs text-gray-500">
                                  {hour.toString().padStart(2, '0')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary Stats */}
                  <div>
                    <h5 className="font-semibold mb-3 text-gray-700">Additional Statistics</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <div className="text-sm text-gray-600">Peak Hour</div>
                        <div className="font-bold" style={{ color: theme.colors.primary }}>
                          {revenueData?.peakHour || 'N/A'}
                        </div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg text-center">
                        <div className="text-sm text-gray-600">Total Items</div>
                        <div className="font-bold" style={{ color: theme.colors.primary }}>
                          {revenueData?.summary?.itemsSold || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}{/* Hidden Full Report for PDF Generation - Always rendered but invisible */}
            <div 
              id="hidden-report-for-pdf"
              style={{ 
                position: 'fixed',
                left: '-9999px',
                top: '0px',
                width: '800px',
                backgroundColor: 'white',
                zIndex: -1,
                visibility: 'hidden',
                opacity: 0,
                pointerEvents: 'none'
              }}
            >
              <PrintableRevenueReport
                ref={printableReportRef}
                revenueData={revenueData}
                selectedPeriod="daily"
                reportDate={new Date()}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border-2 hover:opacity-90 transition-colors"
            style={{ 
              borderColor: theme.colors.muted,
              color: theme.colors.primary
            }}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EndOfShiftModal;
