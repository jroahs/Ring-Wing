import React, { useState, useEffect } from 'react';
import api from './services/apiService';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { FiDownload, FiRefreshCw, FiCalendar, FiBarChart2, FiPieChart } from 'react-icons/fi';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function MonthlyPayrollReport() {
  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSummary();
  }, [selectedMonth, selectedYear]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/api/payroll/summary', {
        params: {
          month: selectedMonth,
          year: selectedYear
        }
      });
      setSummary(response.data.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
      setError('Failed to load payroll summary');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const exportToPDF = () => {
    if (!summary) return;

    const doc = new jsPDF();
    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
    
    // Header
    doc.setFontSize(18);
    doc.text('Monthly Payroll Summary Report', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`${monthName} ${selectedYear}`, 105, 28, { align: 'center' });
    
    let yPos = 45;
    
    // Summary Stats
    doc.setFontSize(14);
    doc.text('Overview', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Total Employees: ${summary.employeeCount}`, 20, yPos);
    yPos += 7;
    doc.text(`Total Payroll Records: ${summary.payrollCount}`, 20, yPos);
    yPos += 7;
    doc.text(`Total Gross Pay: ${formatCurrency(summary.totalGrossPay)}`, 20, yPos);
    yPos += 7;
    doc.text(`Total Deductions: ${formatCurrency(summary.deductions.total)}`, 20, yPos);
    yPos += 7;
    doc.text(`Total Net Pay: ${formatCurrency(summary.totalNetPay)}`, 20, yPos);
    yPos += 15;
    
    // Earnings Breakdown
    doc.setFontSize(14);
    doc.text('Earnings Breakdown', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Basic Pay: ${formatCurrency(summary.earnings.basicPay)}`, 20, yPos);
    yPos += 7;
    doc.text(`Overtime Pay: ${formatCurrency(summary.earnings.overtimePay)}`, 20, yPos);
    yPos += 7;
    doc.text(`Allowances: ${formatCurrency(summary.earnings.allowances)}`, 20, yPos);
    yPos += 7;
    doc.text(`Holiday Pay: ${formatCurrency(summary.earnings.holidayPay)}`, 20, yPos);
    yPos += 7;
    doc.text(`13th Month Pay: ${formatCurrency(summary.earnings.thirteenthMonthPay)}`, 20, yPos);
    yPos += 15;
    
    // Deductions Breakdown
    doc.setFontSize(14);
    doc.text('Deductions Breakdown', 20, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`SSS: ${formatCurrency(summary.deductions.government.sss)}`, 20, yPos);
    yPos += 7;
    doc.text(`PhilHealth: ${formatCurrency(summary.deductions.government.philHealth)}`, 20, yPos);
    yPos += 7;
    doc.text(`Pag-IBIG: ${formatCurrency(summary.deductions.government.pagIbig)}`, 20, yPos);
    yPos += 7;
    doc.text(`Late Deductions: ${formatCurrency(summary.deductions.attendance.late)}`, 20, yPos);
    yPos += 7;
    doc.text(`Absent Deductions: ${formatCurrency(summary.deductions.attendance.absent)}`, 20, yPos);
    yPos += 7;
    doc.text(`Other Deductions: ${formatCurrency(summary.deductions.other)}`, 20, yPos);
    
    // Footer
    doc.setFontSize(8);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 280, { align: 'center' });
    
    doc.save(`Payroll_Summary_${monthName}_${selectedYear}.pdf`);
  };

  const exportToExcel = () => {
    if (!summary) return;

    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
    
    // Overview sheet
    const overviewData = [
      ['Monthly Payroll Summary Report'],
      [`${monthName} ${selectedYear}`],
      [],
      ['Overview'],
      ['Total Employees', summary.employeeCount],
      ['Total Payroll Records', summary.payrollCount],
      ['Total Gross Pay', summary.totalGrossPay],
      ['Total Deductions', summary.deductions.total],
      ['Total Net Pay', summary.totalNetPay],
      [],
      ['Earnings Breakdown'],
      ['Basic Pay', summary.earnings.basicPay],
      ['Overtime Pay', summary.earnings.overtimePay],
      ['Allowances', summary.earnings.allowances],
      ['Holiday Pay', summary.earnings.holidayPay],
      ['13th Month Pay', summary.earnings.thirteenthMonthPay],
      ['Holiday Bonus', summary.earnings.bonuses.holiday],
      ['Performance Bonus', summary.earnings.bonuses.performance],
      [],
      ['Deductions Breakdown'],
      ['SSS', summary.deductions.government.sss],
      ['PhilHealth', summary.deductions.government.philHealth],
      ['Pag-IBIG', summary.deductions.government.pagIbig],
      ['Late Deductions', summary.deductions.attendance.late],
      ['Absent Deductions', summary.deductions.attendance.absent],
      ['Other Deductions', summary.deductions.other]
    ];

    const ws = XLSX.utils.aoa_to_sheet(overviewData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
    
    XLSX.writeFile(wb, `Payroll_Summary_${monthName}_${selectedYear}.xlsx`);
  };

  // Chart data for deductions breakdown
  const deductionsBarData = {
    labels: ['SSS', 'PhilHealth', 'Pag-IBIG', 'Late', 'Absent', 'Other'],
    datasets: [
      {
        label: 'Deductions Amount (PHP)',
        data: summary ? [
          summary.deductions.government.sss,
          summary.deductions.government.philHealth,
          summary.deductions.government.pagIbig,
          summary.deductions.attendance.late,
          summary.deductions.attendance.absent,
          summary.deductions.other
        ] : [],
        backgroundColor: [
          `${colors.primary}CC`,
          `${colors.accent}CC`,
          `${colors.secondary}CC`,
          `${colors.muted}CC`,
          '#6b7280CC',
          '#94a3b8CC'
        ],
        borderColor: [
          colors.primary,
          colors.accent,
          colors.secondary,
          colors.muted,
          '#6b7280',
          '#94a3b8'
        ],
        borderWidth: 2
      }
    ]
  };

  // Pie chart for earnings breakdown
  const earningsPieData = {
    labels: ['Basic Pay', 'Overtime', 'Allowances', 'Holiday Pay', '13th Month', 'Bonuses'],
    datasets: [
      {
        data: summary ? [
          summary.earnings.basicPay,
          summary.earnings.overtimePay,
          summary.earnings.allowances,
          summary.earnings.holidayPay,
          summary.earnings.thirteenthMonthPay,
          (summary.earnings.bonuses.holiday + summary.earnings.bonuses.performance)
        ] : [],
        backgroundColor: [
          `${colors.primary}CC`,
          `${colors.accent}CC`,
          `${colors.secondary}CC`,
          `${colors.muted}CC`,
          '#6b7280CC',
          '#94a3b8CC'
        ],
        borderColor: [
          colors.primary,
          colors.accent,
          colors.secondary,
          colors.muted,
          '#6b7280',
          '#94a3b8'
        ],
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: colors.primary,
          font: {
            size: 12,
            weight: '600'
          },
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: colors.primary,
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: colors.accent,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            return `${context.label}: ${formatCurrency(context.parsed.y || context.parsed)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: colors.muted,
          font: {
            size: 11
          }
        },
        grid: {
          color: `${colors.muted}20`
        }
      },
      x: {
        ticks: {
          color: colors.primary,
          font: {
            size: 11,
            weight: '500'
          }
        },
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', backgroundColor: colors.background, minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '10px', color: colors.primary, fontSize: '28px', fontWeight: 'bold' }}>Monthly Payroll Summary Report</h1>
      <p style={{ marginBottom: '25px', color: colors.muted, fontSize: '14px' }}>Comprehensive payroll analysis with visual insights</p>
      
      {/* Date Selection */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '25px',
        alignItems: 'center',
        flexWrap: 'wrap',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(46, 3, 4, 0.1)',
        border: `1px solid ${colors.muted}30`
      }}>
        <FiCalendar style={{ color: colors.primary, fontSize: '20px' }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: colors.primary, fontWeight: '600', fontSize: '14px' }}>Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: `2px solid ${colors.muted}40`,
              backgroundColor: colors.background,
              color: colors.primary,
              fontWeight: '500',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.3s'
            }}
          >
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ color: colors.primary, fontWeight: '600', fontSize: '14px' }}>Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: `2px solid ${colors.muted}40`,
              backgroundColor: colors.background,
              color: colors.primary,
              fontWeight: '500',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.3s'
            }}
          >
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>
        
        <button
          onClick={fetchSummary}
          style={{
            padding: '10px 20px',
            backgroundColor: colors.accent,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s',
            boxShadow: '0 2px 4px rgba(241, 103, 15, 0.3)'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = colors.secondary}
          onMouseOut={(e) => e.target.style.backgroundColor = colors.accent}
        >
          <FiRefreshCw size={16} />
          Refresh
        </button>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <button
            onClick={exportToPDF}
            disabled={!summary}
            style={{
              padding: '10px 20px',
              backgroundColor: summary ? colors.primary : colors.muted,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: summary ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s',
              opacity: summary ? 1 : 0.5
            }}
          >
            <FiDownload size={16} />
            PDF
          </button>
          
          <button
            onClick={exportToExcel}
            disabled={!summary}
            style={{
              padding: '10px 20px',
              backgroundColor: summary ? colors.secondary : colors.muted,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: summary ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s',
              opacity: summary ? 1 : 0.5
            }}
          >
            <FiDownload size={16} />
            Excel
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #fecaca',
          fontWeight: '500'
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px', 
          color: colors.muted,
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(46, 3, 4, 0.1)'
        }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: `4px solid ${colors.muted}40`, 
            borderTop: `4px solid ${colors.accent}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 15px'
          }} />
          Loading summary...
        </div>
      )}

      {!loading && summary && (
        <>
          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{
              padding: '24px',
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(46, 3, 4, 0.15)',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', opacity: 0.9, fontWeight: '600' }}>Total Gross Pay</h3>
                <FiBarChart2 size={20} style={{ opacity: 0.8 }} />
              </div>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
                {formatCurrency(summary.totalGrossPay)}
              </p>
            </div>
            
            <div style={{
              padding: '24px',
              background: `linear-gradient(135deg, ${colors.accent} 0%, #ff8c42 100%)`,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(241, 103, 15, 0.15)',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', opacity: 0.9, fontWeight: '600' }}>Total Deductions</h3>
                <FiPieChart size={20} style={{ opacity: 0.8 }} />
              </div>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
                {formatCurrency(summary.deductions.total)}
              </p>
            </div>
            
            <div style={{
              padding: '24px',
              background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.accent} 100%)`,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(133, 54, 25, 0.15)',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', opacity: 0.9, fontWeight: '600' }}>Total Net Pay</h3>
                <FiDownload size={20} style={{ opacity: 0.8 }} />
              </div>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
                {formatCurrency(summary.totalNetPay)}
              </p>
            </div>
            
            <div style={{
              padding: '24px',
              background: `linear-gradient(135deg, ${colors.muted} 0%, #8b7d7b 100%)`,
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(172, 156, 155, 0.15)',
              color: 'white'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', opacity: 0.9, fontWeight: '600' }}>Employees Paid</h3>
              </div>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
                {summary.employeeCount}
              </p>
              <p style={{ fontSize: '13px', opacity: 0.8, margin: '8px 0 0 0' }}>
                {summary.payrollCount} payroll records
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '25px',
            marginBottom: '30px'
          }}>
            <div style={{
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 12px rgba(46, 3, 4, 0.08)',
              border: `1px solid ${colors.muted}20`
            }}>
              <h3 style={{ marginTop: 0, color: colors.primary, fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                Deductions Breakdown
              </h3>
              <div style={{ height: '300px' }}>
                <Bar data={deductionsBarData} options={chartOptions} />
              </div>
            </div>
            
            <div style={{
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 12px rgba(46, 3, 4, 0.08)',
              border: `1px solid ${colors.muted}20`
            }}>
              <h3 style={{ marginTop: 0, color: colors.primary, fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                Earnings Distribution
              </h3>
              <div style={{ height: '300px' }}>
                <Pie data={earningsPieData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Detailed Tables */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
            gap: '25px'
          }}>
            {/* Earnings Table */}
            <div style={{
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 12px rgba(46, 3, 4, 0.08)',
              border: `1px solid ${colors.muted}20`
            }}>
              <h3 style={{ marginTop: 0, color: colors.primary, fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                Earnings Details
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${colors.muted}20` }}>
                    <td style={{ padding: '12px 0', color: colors.primary, fontWeight: '500' }}>Basic Pay</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: colors.primary }}>
                      {formatCurrency(summary.earnings.basicPay)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.muted}20` }}>
                    <td style={{ padding: '12px 0', color: colors.primary, fontWeight: '500' }}>Overtime Pay</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: colors.primary }}>
                      {formatCurrency(summary.earnings.overtimePay)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.muted}20` }}>
                    <td style={{ padding: '12px 0', color: colors.primary, fontWeight: '500' }}>Allowances</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: colors.primary }}>
                      {formatCurrency(summary.earnings.allowances)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.muted}20` }}>
                    <td style={{ padding: '12px 0', color: colors.primary, fontWeight: '500' }}>Holiday Pay</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: colors.primary }}>
                      {formatCurrency(summary.earnings.holidayPay)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.muted}20` }}>
                    <td style={{ padding: '12px 0', color: colors.primary, fontWeight: '500' }}>13th Month Pay</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: colors.primary }}>
                      {formatCurrency(summary.earnings.thirteenthMonthPay)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.muted}20` }}>
                    <td style={{ padding: '12px 0', color: colors.primary, fontWeight: '500' }}>Holiday Bonus</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: colors.primary }}>
                      {formatCurrency(summary.earnings.bonuses.holiday)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 0', color: colors.primary, fontWeight: '500' }}>Performance Bonus</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: colors.primary }}>
                      {formatCurrency(summary.earnings.bonuses.performance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions Table */}
            <div style={{
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 2px 12px rgba(46, 3, 4, 0.08)',
              border: `1px solid ${colors.muted}20`
            }}>
              <h3 style={{ marginTop: 0, color: colors.primary, fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                Deductions Details
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ backgroundColor: `${colors.primary}10` }}>
                    <td colSpan="2" style={{ padding: '10px', fontWeight: 'bold', color: colors.primary, fontSize: '14px' }}>
                      Government Deductions
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.muted}20` }}>
                    <td style={{ padding: '12px 0 12px 16px', color: colors.primary }}>SSS</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: colors.accent }}>
                      {formatCurrency(summary.deductions.government.sss)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.muted}20` }}>
                    <td style={{ padding: '12px 0 12px 16px', color: colors.primary }}>PhilHealth</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: colors.accent }}>
                      {formatCurrency(summary.deductions.government.philHealth)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.muted}20` }}>
                    <td style={{ padding: '12px 0 12px 16px', color: colors.primary }}>Pag-IBIG</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: colors.accent }}>
                      {formatCurrency(summary.deductions.government.pagIbig)}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: `${colors.primary}10` }}>
                    <td colSpan="2" style={{ padding: '10px', fontWeight: 'bold', color: colors.primary, fontSize: '14px' }}>
                      Attendance Deductions
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.muted}20` }}>
                    <td style={{ padding: '12px 0 12px 16px', color: colors.primary }}>Late</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: colors.accent }}>
                      {formatCurrency(summary.deductions.attendance.late)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.muted}20` }}>
                    <td style={{ padding: '12px 0 12px 16px', color: colors.primary }}>Absent</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: colors.accent }}>
                      {formatCurrency(summary.deductions.attendance.absent)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '12px 0', color: colors.primary, fontWeight: '500' }}>Other Deductions</td>
                    <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold', color: colors.accent }}>
                      {formatCurrency(summary.deductions.other)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MonthlyPayrollReport;
