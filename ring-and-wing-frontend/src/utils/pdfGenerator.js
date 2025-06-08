import jsPDF from 'jspdf';

export const generateRevenuePDF = (revenueData, selectedPeriod) => {
  // Create PDF with UTF-8 support
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;  // Helper function to format currency (PDF-compatible)
  const formatCurrency = (value) => {
    return `PHP ${parseFloat(value).toLocaleString('en-PH', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  // Helper function to add new page if needed
  const checkPageBreak = (requiredHeight) => {
    if (yPosition + requiredHeight > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }
  };

  // Add header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Ring & Wing Restaurant', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  
  pdf.setFontSize(16);
  pdf.text(`${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Revenue Report`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const reportDate = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  pdf.text(`Generated on: ${reportDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Add line separator
  pdf.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 10;

  // Summary Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary Overview', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
    const summaryData = [
    ['Total Revenue:', formatCurrency(revenueData?.summary?.totalRevenue || 0)],
    ['Total Orders:', (revenueData?.summary?.orderCount || 0).toString()],
    ['Items Sold:', (revenueData?.summary?.itemsSold || 0).toString()],
    ['Average Order Value:', formatCurrency(revenueData?.summary?.averageOrderValue || 0)]
  ];

  summaryData.forEach(([label, value]) => {
    pdf.text(label, 25, yPosition);
    pdf.setFont('helvetica', 'bold');
    pdf.text(value, 120, yPosition);
    pdf.setFont('helvetica', 'normal');
    yPosition += 8;
  });

  yPosition += 10;
  checkPageBreak(30);

  // Revenue by Source Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Revenue by Order Source', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  if (revenueData?.revenueBySource) {
    Object.entries(revenueData.revenueBySource).forEach(([source, amount]) => {
      const sourceName = source === 'self_checkout' ? 'Self Checkout' : 
                        source === 'chatbot' ? 'Chatbot' : 
                        source === 'pos' ? 'POS' : source;
      const percentage = ((amount / (revenueData?.summary?.totalRevenue || 1)) * 100).toFixed(1);
      
      pdf.text(`${sourceName}:`, 25, yPosition);
      pdf.text(formatCurrency(amount), 120, yPosition);
      pdf.text(`(${percentage}%)`, 170, yPosition);
      yPosition += 8;
    });
  }

  yPosition += 10;
  checkPageBreak(30);

  // Revenue by Payment Method Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Revenue by Payment Method', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  if (revenueData?.revenueByPaymentMethod) {
    Object.entries(revenueData.revenueByPaymentMethod).forEach(([method, amount]) => {
      const methodName = method === 'e-wallet' ? 'E-Wallet' : 
                        method === 'cash' ? 'Cash' : method;
      const percentage = ((amount / (revenueData?.summary?.totalRevenue || 1)) * 100).toFixed(1);
      
      pdf.text(`${methodName}:`, 25, yPosition);
      pdf.text(formatCurrency(amount), 120, yPosition);
      pdf.text(`(${percentage}%)`, 170, yPosition);
      yPosition += 8;
    });
  }

  yPosition += 10;
  checkPageBreak(40);

  // Top Items Section
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Top Selling Items', 20, yPosition);
  yPosition += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  // Table headers
  pdf.setFont('helvetica', 'bold');
  pdf.text('Rank', 25, yPosition);
  pdf.text('Item Name', 50, yPosition);
  pdf.text('Qty Sold', 130, yPosition);
  pdf.text('Revenue', 160, yPosition);
  yPosition += 8;

  // Table line
  pdf.line(20, yPosition - 2, pageWidth - 20, yPosition - 2);
  yPosition += 5;
  pdf.setFont('helvetica', 'normal');
  (revenueData?.topItems || []).slice(0, 10).forEach((item, index) => {
    checkPageBreak(10);
    
    pdf.text(`${index + 1}`, 25, yPosition);
    pdf.text((item?.name || 'Unknown Item').substring(0, 25), 50, yPosition); // Truncate long names
    pdf.text((item?.quantity || 0).toString(), 130, yPosition);
    pdf.text(formatCurrency(item?.revenue || 0), 160, yPosition);
    yPosition += 8;
  });

  // Hourly Distribution for Daily Reports
  if (selectedPeriod === 'daily' && revenueData?.hourlyDistribution) {
    yPosition += 10;
    checkPageBreak(50);

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Hourly Revenue Distribution', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');    // Show top performing hours
    const hourlyData = Object.entries(revenueData?.hourlyDistribution || {})
      .map(([hour, revenue]) => ({ 
        hour: `${hour.toString().padStart(2, '0')}:00`, 
        revenue 
      }))
      .filter(item => item.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8); // Top 8 hours

    pdf.setFont('helvetica', 'bold');
    pdf.text('Hour', 25, yPosition);
    pdf.text('Revenue', 80, yPosition);
    yPosition += 8;

    pdf.line(20, yPosition - 2, 140, yPosition - 2);
    yPosition += 5;

    pdf.setFont('helvetica', 'normal');
    hourlyData.forEach(({ hour, revenue }) => {
      pdf.text(hour, 25, yPosition);
      pdf.text(formatCurrency(revenue), 80, yPosition);
      yPosition += 8;
    });
  }

  // Footer
  yPosition = pageHeight - 20;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.text('Generated by Ring & Wing POS System', pageWidth / 2, yPosition, { align: 'center' });

  // Generate filename and save
  const fileName = `Revenue_Report_${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};
