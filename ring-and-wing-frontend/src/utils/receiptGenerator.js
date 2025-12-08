/**
 * Unified Receipt Generator Utility
 * 
 * Generates consistent PDF receipts for both POS and Self-Checkout
 * Customer-facing receipts only - no internal POS data
 */

import jsPDF from 'jspdf';

/**
 * Generate a customer receipt PDF
 * @param {Object} order - Order object with items, totals, etc.
 * @param {Object} options - Optional settings for receipt generation
 * @returns {jsPDF} PDF document
 */
export const generateCustomerReceipt = (order, options = {}) => {
  // Create PDF with receipt dimensions (80mm thermal paper width)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200], // Receipt paper size
    compress: true
  });

  const pageWidth = 80;
  const margin = 5;
  let yPos = 10;
  const lineHeight = 4;
  const sectionGap = 6;

  // Helper function to center text
  const centerText = (text, y, fontSize = 10) => {
    pdf.setFontSize(fontSize);
    const textWidth = pdf.getTextWidth(text);
    pdf.text(text, (pageWidth - textWidth) / 2, y);
  };

  // Helper function for left-right text
  const leftRightText = (left, right, y, fontSize = 8) => {
    pdf.setFontSize(fontSize);
    pdf.text(left, margin, y);
    const rightWidth = pdf.getTextWidth(right);
    pdf.text(right, pageWidth - margin - rightWidth, y);
  };

  // Helper to format currency (using P instead of ₱ for PDF compatibility)
  const formatCurrency = (amount) => {
    return `P${parseFloat(amount).toFixed(2)}`;
  };

  // Helper for separator line
  const drawSeparator = (y, style = 'solid') => {
    pdf.setLineWidth(0.2);
    if (style === 'dashed') {
      pdf.setLineDashPattern([1, 1], 0);
    } else {
      pdf.setLineDashPattern([], 0);
    }
    pdf.line(margin, y, pageWidth - margin, y);
  };

  // === HEADER - Business Info ===
  pdf.setFont('helvetica', 'bold');
  centerText('RING & WING', yPos, 14);
  yPos += 5;

  pdf.setFont('helvetica', 'normal');
  centerText('Fast Food Restaurant', yPos, 8);
  yPos += lineHeight;
  centerText('123 Main Street, City', yPos, 8);
  yPos += lineHeight;
  centerText('Contact: (02) 123-4567', yPos, 8);
  yPos += lineHeight;
  centerText('VAT Reg TIN: 123-456-789-000', yPos, 7);
  yPos += sectionGap;

  drawSeparator(yPos, 'dashed');
  yPos += sectionGap;

  // === ORDER INFO ===
  pdf.setFont('helvetica', 'bold');
  centerText('OFFICIAL RECEIPT', yPos, 10);
  yPos += sectionGap;

  pdf.setFont('helvetica', 'normal');
  const orderNum = order.receiptNumber || order.orderNumber || order._id?.slice(-6);
  leftRightText('Receipt #:', orderNum, yPos);
  yPos += lineHeight;

  const orderDate = new Date(order.createdAt);
  const dateStr = orderDate.toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
  const timeStr = orderDate.toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit'
  });
  leftRightText('Date:', dateStr, yPos);
  yPos += lineHeight;
  leftRightText('Time:', timeStr, yPos);
  yPos += lineHeight;

  // Fulfillment type
  const fulfillmentLabel = order.fulfillmentType === 'delivery' ? 'Delivery' :
                           order.fulfillmentType === 'takeout' ? 'Take-out' : 'Dine-in';
  leftRightText('Type:', fulfillmentLabel, yPos);
  yPos += lineHeight;

  // Staff who processed the order (only show if processedBy exists)
  if (order.processedBy?.username) {
    const staffName = order.processedBy.username || order.server || 'Staff';
    leftRightText('Staff:', staffName, yPos);
    yPos += lineHeight;
  }

  // Customer info if available (but not internal POS data)
  if (order.customerName && order.customerName !== 'Guest') {
    leftRightText('Customer:', order.customerName, yPos);
    yPos += lineHeight;
  }

  yPos += 2;
  drawSeparator(yPos);
  yPos += sectionGap;

  // === ORDER ITEMS ===
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('ITEM', margin, yPos);
  pdf.text('QTY', margin + 40, yPos);
  const priceHeader = 'AMOUNT';
  pdf.text(priceHeader, pageWidth - margin - pdf.getTextWidth(priceHeader), yPos);
  yPos += lineHeight;

  drawSeparator(yPos, 'dashed');
  yPos += 3;

  pdf.setFont('helvetica', 'normal');

  if (order.items && order.items.length > 0) {
    order.items.forEach((item) => {
      // Item name (truncate if too long)
      const itemName = item.name || 'Unknown Item';
      const displayName = itemName.length > 20 ? itemName.substring(0, 18) + '...' : itemName;

      pdf.setFontSize(8);
      pdf.text(displayName, margin, yPos);
      pdf.text(`x${item.quantity}`, margin + 42, yPos);

      const itemTotal = (item.price * item.quantity).toFixed(2);
      const totalText = formatCurrency(itemTotal);
      pdf.text(totalText, pageWidth - margin - pdf.getTextWidth(totalText), yPos);
      yPos += lineHeight;

      // Size if available
      if (item.selectedSize && item.selectedSize.name) {
        pdf.setFontSize(7);
        pdf.text(`  Size: ${item.selectedSize.name}`, margin, yPos);
        yPos += 3;
      }

      // Variant/Flavor if available
      if (item.variant && item.variant.name) {
        pdf.setFontSize(7);
        pdf.text(`  Flavor: ${item.variant.name}`, margin, yPos);
        yPos += 3;
      }

      // Add-ons if available
      if (item.addOns && item.addOns.length > 0) {
        item.addOns.forEach(addon => {
          pdf.setFontSize(7);
          const addonText = `  + ${addon.name}`;
          pdf.text(addonText, margin, yPos);
          if (addon.price) {
            const addonPrice = formatCurrency(addon.price);
            pdf.text(addonPrice, pageWidth - margin - pdf.getTextWidth(addonPrice), yPos);
          }
          yPos += 3;
        });
      }

      // Customer notes (if any) - NOT internal POS notes
      if (item.notes) {
        pdf.setFontSize(7);
        pdf.text(`  Note: ${item.notes}`, margin, yPos);
        yPos += 3;
      }

      yPos += 1;
    });
  }

  yPos += 2;
  drawSeparator(yPos);
  yPos += sectionGap;

  // === TOTALS ===
  pdf.setFontSize(8);

  // Subtotal
  leftRightText('Subtotal:', formatCurrency(order.totals?.subtotal || 0), yPos);
  yPos += lineHeight;

  // Discount if any
  if (order.totals?.discount > 0) {
    leftRightText('Discount:', `-${formatCurrency(order.totals.discount)}`, yPos);
    yPos += lineHeight;
  }

  // VAT Exemption if any
  if (order.totals?.vatExemption > 0) {
    leftRightText('VAT Exemption:', `-${formatCurrency(order.totals.vatExemption)}`, yPos);
    yPos += lineHeight;
  }

  // Delivery fee if applicable
  if (order.fulfillmentType === 'delivery' && order.totals?.deliveryFee > 0) {
    leftRightText('Delivery Fee:', formatCurrency(order.totals.deliveryFee), yPos);
    yPos += lineHeight;
  }

  // VAT breakdown
  const vatAmount = ((order.totals?.subtotal || 0) * 0.12).toFixed(2);
  const vatableSales = ((order.totals?.subtotal || 0) / 1.12).toFixed(2);
  leftRightText('VATable Sales:', formatCurrency(vatableSales), yPos);
  yPos += lineHeight;
  leftRightText('VAT (12%):', formatCurrency(vatAmount), yPos);
  yPos += lineHeight + 2;

  drawSeparator(yPos);
  yPos += 3;

  // Total
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  leftRightText('TOTAL:', formatCurrency(order.totals?.total || 0), yPos, 10);
  yPos += sectionGap;

  // Payment info
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const paymentMethod = order.paymentMethod === 'gcash' ? 'GCash' :
                       order.paymentMethod === 'paymongo' ? 'Online Payment' :
                       order.paymentMethod === 'cash' ? 'Cash' : 'Pending';
  leftRightText('Payment:', paymentMethod, yPos);
  yPos += sectionGap;

  drawSeparator(yPos, 'dashed');
  yPos += sectionGap;

  // === FOOTER ===
  pdf.setFontSize(7);
  centerText('Thank you for your order!', yPos);
  yPos += lineHeight;
  centerText('Please come again', yPos);
  yPos += lineHeight + 2;

  centerText('This serves as your OFFICIAL RECEIPT', yPos);
  yPos += lineHeight;

  // Generation timestamp
  pdf.setFontSize(6);
  const generatedDate = new Date().toLocaleString('en-PH');
  centerText(`Generated: ${generatedDate}`, yPos);

  return pdf;
};

/**
 * Download receipt as PDF
 * @param {Object} order - Order object
 * @param {string} filename - Optional custom filename
 */
export const downloadReceipt = (order, filename = null) => {
  const pdf = generateCustomerReceipt(order);
  const receiptNum = order.receiptNumber || order.orderNumber || 'receipt';
  const finalFilename = filename || `receipt-${receiptNum}.pdf`;
  pdf.save(finalFilename);
};

/**
 * Open receipt in new window for printing
 * @param {Object} order - Order object
 */
export const printReceipt = (order) => {
  const pdf = generateCustomerReceipt(order);
  const pdfBlob = pdf.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  
  const printWindow = window.open(blobUrl, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
      // Clean up blob URL after printing
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    };
  }
};
