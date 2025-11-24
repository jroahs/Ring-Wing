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

/**
 * Generate Payslip PDF with Government Deductions
 * @param {Object} payslipData - Complete payslip data from API
 */
export const generatePayslipPDF = (payslipData) => {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper function to format currency
  const formatCurrency = (value) => {
    return `PHP ${parseFloat(value || 0).toFixed(2)}`;
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Ring & Wing Restaurant', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  pdf.setFontSize(14);
  pdf.text('PAYSLIP', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Period
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Pay Period: ${formatDate(payslipData.payrollPeriod)}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  pdf.setFontSize(8);
  pdf.text(`Generated: ${new Date().toLocaleString('en-PH')}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Line separator
  pdf.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 8;

  // Employee Information Section
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EMPLOYEE INFORMATION', 20, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  const employeeInfo = [
    ['Name:', payslipData.staffId?.name || 'N/A'],
    ['Position:', payslipData.staffId?.position || 'N/A'],
    ['SSS Number:', payslipData.staffId?.sssNumber || 'Not on file'],
    ['PhilHealth Number:', payslipData.staffId?.philHealthNumber || 'Not on file'],
    ['Pag-IBIG Number:', payslipData.staffId?.pagIbigNumber || 'Not on file'],
    ['TIN:', payslipData.staffId?.tinNumber || 'Not on file']
  ];

  employeeInfo.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, 25, yPosition);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, 70, yPosition);
    yPosition += 6;
  });

  yPosition += 5;
  pdf.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 8;

  // Earnings Section
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EARNINGS', 20, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  const earnings = [];
  earnings.push(['Basic Pay', formatCurrency(payslipData.basicPay)]);
  
  if (payslipData.overtimePay > 0) {
    earnings.push(['Overtime Pay', formatCurrency(payslipData.overtimePay)]);
  }
  if (payslipData.allowances > 0) {
    earnings.push(['Allowances', formatCurrency(payslipData.allowances)]);
  }
  if (payslipData.holidayPay > 0) {
    earnings.push(['Holiday Pay', formatCurrency(payslipData.holidayPay)]);
  }
  if (payslipData.thirteenthMonthPay > 0) {
    earnings.push(['13th Month Pay', formatCurrency(payslipData.thirteenthMonthPay)]);
  }
  if (payslipData.bonuses?.performance > 0) {
    earnings.push(['Performance Bonus', formatCurrency(payslipData.bonuses.performance)]);
  }
  if (payslipData.bonuses?.other > 0) {
    earnings.push(['Other Bonus', formatCurrency(payslipData.bonuses.other)]);
  }

  earnings.forEach(([label, value]) => {
    pdf.text(label, 25, yPosition);
    pdf.text(value, 150, yPosition, { align: 'right' });
    yPosition += 6;
  });

  yPosition += 2;
  pdf.line(25, yPosition, 150, yPosition);
  yPosition += 6;

  // Total Earnings
  const totalEarnings = 
    (payslipData.basicPay || 0) +
    (payslipData.overtimePay || 0) +
    (payslipData.allowances || 0) +
    (payslipData.holidayPay || 0) +
    (payslipData.thirteenthMonthPay || 0) +
    (payslipData.bonuses?.performance || 0) +
    (payslipData.bonuses?.other || 0);

  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL EARNINGS', 25, yPosition);
  pdf.text(formatCurrency(totalEarnings), 150, yPosition, { align: 'right' });
  yPosition += 10;

  pdf.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 8;

  // Deductions Section
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DEDUCTIONS', 20, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');

  // Attendance Deductions
  pdf.setFont('helvetica', 'bold');
  pdf.text('Attendance Deductions:', 25, yPosition);
  yPosition += 6;
  pdf.setFont('helvetica', 'normal');

  pdf.text('Late', 30, yPosition);
  pdf.text(formatCurrency(payslipData.deductions?.late || 0), 150, yPosition, { align: 'right' });
  yPosition += 6;

  pdf.text('Absence', 30, yPosition);
  pdf.text(formatCurrency(payslipData.deductions?.absence || 0), 150, yPosition, { align: 'right' });
  yPosition += 8;

  // Government Deductions
  pdf.setFont('helvetica', 'bold');
  pdf.text('Government Deductions:', 25, yPosition);
  yPosition += 6;
  pdf.setFont('helvetica', 'normal');

  const govtDeductions = [
    ['SSS (5%)', payslipData.deductions?.sss || 0, payslipData.staffId?.sssNumber],
    ['PhilHealth (2.5%)', payslipData.deductions?.philHealth || 0, payslipData.staffId?.philHealthNumber],
    ['Pag-IBIG (2%)', payslipData.deductions?.pagIbig || 0, payslipData.staffId?.pagIbigNumber]
  ];

  govtDeductions.forEach(([label, amount, idNumber]) => {
    pdf.text(label, 30, yPosition);
    if (idNumber) {
      pdf.setFontSize(8);
      pdf.text(`(${idNumber})`, 60, yPosition);
      pdf.setFontSize(10);
    } else {
      pdf.setFontSize(8);
      pdf.text('(No ID on file)', 60, yPosition);
      pdf.setFontSize(10);
    }
    pdf.text(formatCurrency(amount), 150, yPosition, { align: 'right' });
    yPosition += 6;
  });

  yPosition += 2;

  // Withholding Tax
  pdf.text('Withholding Tax', 30, yPosition);
  pdf.text(formatCurrency(payslipData.deductions?.withholdingTax || 0), 150, yPosition, { align: 'right' });
  yPosition += 6;

  yPosition += 2;
  pdf.line(25, yPosition, 150, yPosition);
  yPosition += 6;

  // Total Deductions
  const totalDeductions = 
    (payslipData.deductions?.late || 0) +
    (payslipData.deductions?.absence || 0) +
    (payslipData.deductions?.sss || 0) +
    (payslipData.deductions?.philHealth || 0) +
    (payslipData.deductions?.pagIbig || 0) +
    (payslipData.deductions?.withholdingTax || 0);

  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL DEDUCTIONS', 25, yPosition);
  pdf.text(formatCurrency(totalDeductions), 150, yPosition, { align: 'right' });
  yPosition += 10;

  pdf.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 10;

  // Net Pay
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('NET PAY', 25, yPosition);
  pdf.text(formatCurrency(payslipData.netPay || 0), 150, yPosition, { align: 'right' });
  yPosition += 12;

  pdf.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 10;

  // Government Deduction Disclaimer
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  const disclaimer = [
    'Note: Government deductions are calculated based on 2024 official rates:',
    '- SSS: 5% of Monthly Salary Credit (MSC) based on salary bracket',
    '- PhilHealth: 2.5% of monthly salary (min: PHP 10,000, max: PHP 100,000)',
    '- Pag-IBIG: 2% of monthly salary (maximum PHP 200)',
    'Deductions are only applied if the corresponding government ID is on file.'
  ];

  disclaimer.forEach(line => {
    pdf.text(line, 20, yPosition);
    yPosition += 4;
  });

  yPosition += 6;

  // Additional Info
  if (payslipData.totalHoursWorked) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Hours Worked: ${payslipData.totalHoursWorked}`, 20, yPosition);
    if (payslipData.overtimeHours > 0) {
      pdf.text(`Overtime Hours: ${payslipData.overtimeHours}`, 100, yPosition);
    }
    yPosition += 8;
  }

  // Footer
  yPosition = pageHeight - 15;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.text('This is a system-generated payslip. No signature required.', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;
  pdf.text('Ring & Wing Restaurant Payroll System', pageWidth / 2, yPosition, { align: 'center' });

  // Generate filename and save
  const employeeName = (payslipData.staffId?.name || 'Unknown').replace(/\s+/g, '_');
  const periodDate = new Date(payslipData.payrollPeriod).toISOString().split('T')[0];
  const fileName = `Payslip_${employeeName}_${periodDate}.pdf`;
  
  pdf.save(fileName);
};
