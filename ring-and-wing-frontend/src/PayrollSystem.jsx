import { useState, useEffect } from 'react';
import { FiUser, FiDollarSign, FiCalendar, FiClock, FiFileText, FiPrinter } from 'react-icons/fi';
import Sidebar from './Sidebar';
import WorkIDModal from './WorkIDModal';

const PayrollSystem = () => {
  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };

  // Layout state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isDesktop = windowWidth >= 768;

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 768) setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getMainContentMargin = () => {
    if (windowWidth < 768) return '0';
    return windowWidth >= 1920 ? '8rem' : '5rem';
  };

  // Data state
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [payrollPeriod, setPayrollPeriod] = useState('');
  const [attendance, setAttendance] = useState({ 
    totalHoursWorked: '160',
    overtimeHours: ''
  });
  const [deductions, setDeductions] = useState({ 
    lateMinutes: 0, 
    absences: 0 
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch employees from backend
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/staff');
        const data = await response.json();
        setEmployees(data.map(emp => ({
          ...emp,
          dailyRate: Number(emp.dailyRate) || 0,
          allowances: Number(emp.allowances) || 0,
          scheduledHoursPerDay: Number(emp.scheduledHoursPerDay) || 8
        })));
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch payment history when employee is selected
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (selectedEmployee) {
        try {
          const response = await fetch(`/api/payroll/staff/${selectedEmployee._id}`);
          const data = await response.json();
          setPaymentHistory(data);
        } catch (error) {
          console.error('Error fetching payment history:', error);
        }
      }
    };
    fetchPaymentHistory();
  }, [selectedEmployee]);

  // Salary calculation
  const calculateNetSalary = () => {
    if (!selectedEmployee) return { netPay: 0 };
  
    // Convert inputs with validation
    const totalHours = Math.max(Number(attendance.totalHoursWorked)) || 0;
    const manualOvertime = Math.max(Number(attendance.overtimeHours)) || 0;
    const dailyRate = Number(selectedEmployee.dailyRate) || 0;
    const allowances = Number(selectedEmployee.allowances) || 0;
    const scheduledDailyHours = Math.max(Number(selectedEmployee.scheduledHoursPerDay)) || 8;

    // Calculate monthly values
    const monthlyBasic = dailyRate * 22;
    const scheduledMonthlyHours = 22 * scheduledDailyHours;
    const hourlyRate = scheduledMonthlyHours > 0 ? monthlyBasic / scheduledMonthlyHours : 0;

    // Time calculations
    const overtimeHours = manualOvertime || Math.max(totalHours - scheduledMonthlyHours, 0);
    const regularHours = Math.min(totalHours, scheduledMonthlyHours);

    // Payment components
    const basicPay = dailyRate * 22;
    const overtimePay = overtimeHours * hourlyRate * 1.25;
    const lateDeduction = (Number(deductions.lateMinutes) || 0) * (hourlyRate / 60);
    const absenceDeduction = (Number(deductions.absences) || 0) * dailyRate;

    // Net pay calculation
    const netPay = (
      basicPay +
      overtimePay +
      allowances -
      (lateDeduction + absenceDeduction)
    );

    return {
      netPay: isNaN(netPay) ? 0 : Number(netPay.toFixed(2)),
      basicPay,
      overtimePay,
      lateDeduction,
      absenceDeduction,
      allowances,
      dailyRate
    };
  };

  // Handle payroll submission
  const handlePayslipGeneration = async () => {
    if (!selectedEmployee || !payrollPeriod) return;

    try {
      const { netPay, basicPay, overtimePay, lateDeduction, absenceDeduction } = calculateNetSalary();

      const response = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedEmployee._id,
          payrollPeriod: new Date(payrollPeriod),
          basicPay,
          overtimePay,
          allowances: selectedEmployee.allowances,
          deductions: {
            late: lateDeduction,
            absence: absenceDeduction
          },
          netPay
        })
      });

      if (!response.ok) throw new Error('Failed to save payroll');
      const newPayroll = await response.json();
      setPaymentHistory([...paymentHistory, newPayroll]);
      
      // Reset form
      setAttendance({ totalHoursWorked: '160', overtimeHours: '' });
      setDeductions({ lateMinutes: 0, absences: 0 });
      
    } catch (error) {
      console.error('Payroll submission error:', error);
    }
  };

  // Date formatting helpers
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long' };
    return new Date(dateString).toLocaleDateString('en-PH', options);
  };

  const formatShortDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH');
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
      <div 
        className="flex-1 transition-all duration-300"
        style={{
          marginLeft: getMainContentMargin(),
          paddingTop: windowWidth < 768 ? '4rem' : '0'
        }}
      >
        <div className="p-6 md:p-8 pt-24 md:pt-8">
          <h1 className="text-3xl font-bold mb-6" style={{ color: colors.primary }}>
            <FiDollarSign className="inline mr-2" />
            Payroll Management
          </h1>

          {isLoading ? (
            <div className="text-center" style={{ color: colors.primary }}>
              Loading payroll data...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Employee List */}
              <div className="lg:col-span-1">
                <div className="rounded-lg p-4 shadow-sm" style={{ backgroundColor: colors.primary }}>
                  <h2 className="text-xl font-semibold mb-4" style={{ color: colors.background }}>
                    <FiUser className="inline mr-2" />
                    Employees
                  </h2>
                  <div className="space-y-2">
                    {employees.map((employee) => (
                      <div
                        key={employee._id}
                        onClick={() => setSelectedEmployee(employee)}
                        className={`p-3 rounded cursor-pointer transition-colors ${
                          selectedEmployee?._id === employee._id
                            ? 'ring-2 ring-opacity-50'
                            : 'hover:ring-2 hover:ring-opacity-30'
                        }`}
                        style={{
                          backgroundColor: colors.background,
                          color: colors.primary,
                          ringColor: colors.accent
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 bg-cover bg-center border rounded-sm"
                            style={{ 
                              backgroundImage: `url(${employee.profilePicture || 'https://via.placeholder.com/150'})`,
                              borderColor: colors.muted,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat'
                            }}
                          ></div>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm" style={{ color: colors.muted }}>
                              {employee.position}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Payroll Details */}
              <div className="lg:col-span-2">
                <div className="rounded-lg p-6 shadow-sm mb-6" style={{ border: `1px solid ${colors.muted}` }}>
                  <h2 className="text-xl font-semibold mb-4" style={{ color: colors.primary }}>
                    <FiCalendar className="inline mr-2" />
                    Payroll Period
                  </h2>
                  <input
                    type="month"
                    value={payrollPeriod}
                    onChange={(e) => setPayrollPeriod(e.target.value)}
                    className="w-full p-2 rounded border mb-4"
                    style={{ borderColor: colors.muted }}
                    required
                  />

                  {selectedEmployee && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Attendance Section */}
                        <div>
                          <h3 className="font-medium mb-2" style={{ color: colors.secondary }}>
                            <FiClock className="inline mr-2" />
                            Attendance
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span>Total Hours Worked:</span>
                              <input
                                type="number"
                                value={attendance.totalHoursWorked}
                                onChange={(e) => setAttendance({ ...attendance, totalHoursWorked: e.target.value })}
                                className="w-24 p-1 text-right border rounded"
                                style={{ borderColor: colors.muted }}
                                min="0"
                              />
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Overtime Hours:</span>
                              <input
                                type="number"
                                value={attendance.overtimeHours}
                                onChange={(e) => setAttendance({ ...attendance, overtimeHours: e.target.value })}
                                className="w-24 p-1 text-right border rounded"
                                style={{ borderColor: colors.muted }}
                                min="0"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Deductions Section */}
                        <div>
                          <h3 className="font-medium mb-2" style={{ color: colors.secondary }}>
                            <FiFileText className="inline mr-2" />
                            Deductions
                          </h3>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span>Late Minutes:</span>
                              <input
                                type="number"
                                value={deductions.lateMinutes}
                                onChange={(e) => setDeductions({ ...deductions, lateMinutes: Number(e.target.value) })}
                                className="w-24 p-1 text-right border rounded"
                                style={{ borderColor: colors.muted }}
                                min="0"
                              />
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Absences:</span>
                              <input
                                type="number"
                                value={deductions.absences}
                                onChange={(e) => setDeductions({ ...deductions, absences: Number(e.target.value) })}
                                className="w-24 p-1 text-right border rounded"
                                style={{ borderColor: colors.muted }}
                                min="0"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pay Breakdown */}
                      <div className="bg-opacity-10 p-4 rounded mb-4" style={{ backgroundColor: colors.accent + '15' }}>
                        <div className="flex justify-between items-center mb-2">
                          <span>Daily Rate:</span>
                          <span>₱{selectedEmployee.dailyRate?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span>Monthly Basic:</span>
                          <span>₱{(selectedEmployee.dailyRate * 22)?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span>Allowances:</span>
                          <span>₱{selectedEmployee.allowances?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center font-semibold pt-2">
                          <span style={{ color: colors.secondary }}>Net Pay:</span>
                          <span style={{ color: colors.secondary }}>
                            ₱{calculateNetSalary().netPay.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col md:flex-row gap-4">
                        <button
                          onClick={handlePayslipGeneration}
                          className="w-full py-2 rounded font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: colors.accent, color: colors.background }}
                          disabled={!payrollPeriod}
                        >
                          <FiPrinter className="inline mr-2" />
                          Generate Payslip
                        </button>
                        <button
                          onClick={() => setIsModalOpen(true)}
                          className="w-full py-2 rounded font-semibold transition-opacity hover:opacity-90"
                          style={{ backgroundColor: colors.primary, color: colors.background }}
                        >
                          <FiUser className="inline mr-2" />
                          View Work ID
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Payment History */}
                <div className="rounded-lg p-6 shadow-sm" style={{ border: `1px solid ${colors.muted}` }}>
                  <h2 className="text-xl font-semibold mb-4" style={{ color: colors.primary }}>
                    Payment History
                  </h2>
                  <div className="space-y-2">
                    {paymentHistory.map((payment) => (
                      <div
                        key={payment._id}
                        className="p-3 rounded flex justify-between items-center"
                        style={{ 
                          backgroundColor: colors.background, 
                          border: `1px solid ${colors.muted}` 
                        }}
                      >
                        <div>
                          <p className="font-medium">{payment.staffId?.name}</p>
                          <p className="text-sm" style={{ color: colors.muted }}>
                            {formatDate(payment.payrollPeriod)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold" style={{ color: colors.secondary }}>
                            ₱{payment.netPay?.toFixed(2)}
                          </p>
                          <p className="text-sm" style={{ color: colors.muted }}>
                            {formatShortDate(payment.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Work ID Modal */}
      {isModalOpen && selectedEmployee && (
        <WorkIDModal 
          staff={selectedEmployee} 
          onClose={() => setIsModalOpen(false)} 
          colors={colors} 
        />
      )}

      <style jsx>{`
        input[type='number']::-webkit-inner-spin-button,
        input[type='number']::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

export default PayrollSystem;