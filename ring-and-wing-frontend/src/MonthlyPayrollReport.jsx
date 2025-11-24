import React, { useState, useEffect } from 'react';
import api from './services/apiService';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
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
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1
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
          'rgba(75, 192, 192, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 159, 64, 0.6)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${formatCurrency(context.parsed.y || context.parsed)}`;
          }
        }
      }
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px', color: '#333' }}>Monthly Payroll Summary Report</h1>
      
      {/* Date Selection */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '20px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          >
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Year:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd'
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
            padding: '8px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh
        </button>
        
        <button
          onClick={exportToPDF}
          disabled={!summary}
          style={{
            padding: '8px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: summary ? 'pointer' : 'not-allowed',
            opacity: summary ? 1 : 0.6
          }}
        >
          Export PDF
        </button>
        
        <button
          onClick={exportToExcel}
          disabled={!summary}
          style={{
            padding: '8px 20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: summary ? 'pointer' : 'not-allowed',
            opacity: summary ? 1 : 0.6
          }}
        >
          Export Excel
        </button>
      </div>

      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Loading summary...
        </div>
      )}

      {!loading && summary && (
        <>
          {/* Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div style={{
              padding: '20px',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>Total Gross Pay</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                {formatCurrency(summary.totalGrossPay)}
              </p>
            </div>
            
            <div style={{
              padding: '20px',
              backgroundColor: '#ffebee',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#c62828' }}>Total Deductions</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                {formatCurrency(summary.deductions.total)}
              </p>
            </div>
            
            <div style={{
              padding: '20px',
              backgroundColor: '#e8f5e9',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#2e7d32' }}>Total Net Pay</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                {formatCurrency(summary.totalNetPay)}
              </p>
            </div>
            
            <div style={{
              padding: '20px',
              backgroundColor: '#f3e5f5',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#6a1b9a' }}>Employees Paid</h3>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                {summary.employeeCount}
              </p>
              <p style={{ fontSize: '14px', color: '#666', margin: '5px 0 0 0' }}>
                {summary.payrollCount} payroll records
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
            gap: '30px',
            marginBottom: '30px'
          }}>
            <div style={{
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginTop: 0 }}>Deductions Breakdown</h3>
              <div style={{ height: '300px' }}>
                <Bar data={deductionsBarData} options={chartOptions} />
              </div>
            </div>
            
            <div style={{
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginTop: 0 }}>Earnings Distribution</h3>
              <div style={{ height: '300px' }}>
                <Pie data={earningsPieData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Detailed Tables */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
            gap: '20px'
          }}>
            {/* Earnings Table */}
            <div style={{
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginTop: 0 }}>Earnings Details</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>Basic Pay</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(summary.earnings.basicPay)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>Overtime Pay</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(summary.earnings.overtimePay)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>Allowances</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(summary.earnings.allowances)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>Holiday Pay</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(summary.earnings.holidayPay)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>13th Month Pay</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(summary.earnings.thirteenthMonthPay)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>Holiday Bonus</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(summary.earnings.bonuses.holiday)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>Performance Bonus</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(summary.earnings.bonuses.performance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions Table */}
            <div style={{
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ marginTop: 0 }}>Deductions Details</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee', backgroundColor: '#f5f5f5' }}>
                    <td colSpan="2" style={{ padding: '10px', fontWeight: 'bold' }}>
                      Government Deductions
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 10px 10px 20px' }}>SSS</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(summary.deductions.government.sss)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 10px 10px 20px' }}>PhilHealth</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(summary.deductions.government.philHealth)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 10px 10px 20px' }}>Pag-IBIG</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(summary.deductions.government.pagIbig)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee', backgroundColor: '#f5f5f5' }}>
                    <td colSpan="2" style={{ padding: '10px', fontWeight: 'bold' }}>
                      Attendance Deductions
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 10px 10px 20px' }}>Late</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(summary.deductions.attendance.late)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 10px 10px 20px' }}>Absent</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                      {formatCurrency(summary.deductions.attendance.absent)}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>Other Deductions</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>
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
