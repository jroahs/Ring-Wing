import { useState, useEffect } from 'react';
import { FiUser, FiDollarSign, FiCalendar, FiClock, FiFileText, FiPrinter, FiEdit } from 'react-icons/fi';
import { FaWrench } from 'react-icons/fa';
import Sidebar from './Sidebar';
import { default as WorkIDModal } from './WorkIDModal';
import TimeLogHistory from './components/TimeLogHistory';
import StaffAvatar from './components/StaffAvatar';
import axios from 'axios';
import { toast } from 'react-toastify';

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

  // Set current month as default for payroll period
  const getCurrentMonthYearString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // Data state
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [payrollPeriod, setPayrollPeriod] = useState(getCurrentMonthYearString());
  const [attendance, setAttendance] = useState({ 
    totalHoursWorked: '0',
    overtimeHours: '0'
  });
  const [deductions, setDeductions] = useState({ 
    lateMinutes: 0, 
    absences: 0 
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeLogs, setTimeLogs] = useState([]);
  const [hoursData, setHoursData] = useState(null);
  const [showManualAdjustments, setShowManualAdjustments] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Fetch employees from backend
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        // Add auth token to request headers
        const token = localStorage.getItem('authToken');
        const config = {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        };
        
        const { data } = await axios.get('/api/staff', config);
        // Ensure data is an array before mapping
        if (!Array.isArray(data)) {
          throw new Error('Invalid staff data format');
        }
        const formattedEmployees = data.map(emp => ({
          ...emp,
          dailyRate: Number(emp.dailyRate) || 0,
          allowances: Number(emp.allowances) || 0
        }));
        setEmployees(formattedEmployees);
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch staff data');
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
          // Add auth token to request headers
          const token = localStorage.getItem('authToken');
          const config = {
            headers: { 
              'Authorization': `Bearer ${token}`
            }
          };

          const { data } = await axios.get(`/api/payroll/staff/${selectedEmployee._id}`, config);
          setPaymentHistory(Array.isArray(data.data) ? data.data : []);
        } catch (error) {
          console.error('Error fetching payment history:', error);
          toast.error(error.response?.data?.message || 'Failed to fetch payment history');
        }
      }
    };
    fetchPaymentHistory();
  }, [selectedEmployee]);

  // Fetch time logs when employee and period change
  useEffect(() => {
    if (selectedEmployee && payrollPeriod) {
      const startDate = new Date(payrollPeriod);
      startDate.setDate(1); // Start of month
      const endDate = new Date(payrollPeriod);
      endDate.setMonth(endDate.getMonth() + 1, 0); // End of month
      
      fetchTimeLogs(selectedEmployee._id, startDate, endDate);
    }
  }, [selectedEmployee, payrollPeriod]);

  const fetchTimeLogs = async (staffId, startDate, endDate) => {
    try {
      const params = new URLSearchParams({ 
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      });
      
      // Add auth token to request headers
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };
      
      // Fetch time logs for history display
      const logsResponse = await axios.get(`/api/time-logs/staff/${staffId}?${params}`, config);
      
      if (!logsResponse.data?.success) {
        throw new Error('Failed to fetch time logs');
      }
      
      const logs = logsResponse.data.data || [];
      setTimeLogs(logs);
      
      // Fetch calculated hours data from the new endpoint
      const hoursResponse = await axios.get(`/api/time-logs/staff/${staffId}/hours?${params}`, config);
      
      if (!hoursResponse.data?.success) {
        throw new Error('Failed to calculate working hours');
      }
      
      const hours = hoursResponse.data.data;
      setHoursData(hours);
      
      // Update attendance with the calculated values
      setAttendance({
        totalHoursWorked: hours.totalHours.toString(),
        overtimeHours: hours.overtimeHours.toString()
      });
      
    } catch (error) {
      console.error('Error fetching time logs and hours:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch time logs');
      setTimeLogs([]);
      setHoursData(null);
      setAttendance({ totalHoursWorked: '0', overtimeHours: '0' });
    }
  };

  // Salary calculation with flexible hours
  const calculateNetSalary = () => {
    if (!selectedEmployee) return { netPay: 0 };
  
    // Get values with proper validation
    const dailyRate = Number(selectedEmployee.dailyRate) || 0;
    const allowances = Number(selectedEmployee.allowances) || 0;
    
    // Handle manual adjustments properly
    // If manual values are provided, use them instead of the calculated values
    const manualTotalHours = attendance.totalHoursWorked ? Number(attendance.totalHoursWorked) : 0;
    const manualOvertimeHours = attendance.overtimeHours ? Number(attendance.overtimeHours) : 0;
    
    // Use manual inputs if they're non-zero, otherwise use calculated values from API
    const totalHours = manualTotalHours > 0 ? manualTotalHours : 
                     (hoursData ? Number(hoursData.totalHours) : 0);
    
    const overtimeHours = manualOvertimeHours > 0 ? manualOvertimeHours : 
                     (hoursData ? Number(hoursData.overtimeHours) : 0);
    
    // Calculate regular hours (total - overtime)
    const regularHours = Math.max(0, totalHours - overtimeHours);
    
    // Calculate hourly rate from daily rate
    const hourlyRate = dailyRate / 8; // Assuming 8-hour standard day for rate calculation
    
    // Payment components
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * (hourlyRate * 1.25); // 1.25x for overtime
    
    // Deductions
    const lateMinutes = Number(deductions.lateMinutes) || 0;
    const absences = Number(deductions.absences) || 0;
    const lateDeduction = lateMinutes * (hourlyRate / 60);
    const absenceDeduction = absences * dailyRate;
    const totalDeductions = lateDeduction + absenceDeduction;

    // Net pay calculation
    const netPay = (
      regularPay +
      overtimePay +
      allowances -
      totalDeductions
    );

    return {
      netPay: isNaN(netPay) ? 0 : Number(netPay.toFixed(2)),
      regularPay,
      overtimePay,
      lateDeduction,
      absenceDeduction,
      totalDeductions,
      allowances,
      dailyRate,
      regularHours,
      overtimeHours,
      totalHours
    };
  };

  // Handle payroll submission
  const handlePayslipGeneration = async () => {
    if (!selectedEmployee || !payrollPeriod) return;

    try {
      const { 
        netPay, regularPay, overtimePay, 
        lateDeduction, absenceDeduction,
        regularHours, overtimeHours, totalHours
      } = calculateNetSalary();

      // Add auth token to request headers
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };

      const { data } = await axios.post('/api/payroll', {
        staffId: selectedEmployee._id,
        payrollPeriod: new Date(payrollPeriod),
        basicPay: regularPay,
        overtimePay,
        totalHoursWorked: totalHours,
        overtimeHours,
        allowances: selectedEmployee.allowances,
        deductions: {
          late: lateDeduction,
          absence: absenceDeduction
        },
        netPay,
        timeLogs: timeLogs.map(log => log._id)
      }, config);

      if (data?.success) {
        setPaymentHistory([...paymentHistory, data.data]);
        toast.success('Payroll generated successfully');
        
        // Reset form
        setDeductions({ lateMinutes: 0, absences: 0 });
      } else {
        throw new Error('Failed to save payroll');
      }
    } catch (error) {
      console.error('Payroll submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to generate payroll');
    }
  };

  // New function to generate test data for payroll calculations
  const generateTestTimeLogData = async () => {
    if (!selectedEmployee || !payrollPeriod) {
      toast.error('Please select an employee and payroll period first');
      return;
    }

    try {
      // Show confirmation dialog before generating test data
      if (!window.confirm('This will create sample time log data for testing purposes. Continue?')) {
        return;
      }

      setIsLoading(true);
      
      const startDate = new Date(payrollPeriod);
      startDate.setDate(1); // Start of month
      const endDate = new Date(payrollPeriod);
      endDate.setMonth(endDate.getMonth() + 1, 0); // End of month
      
      // Add auth token to request headers
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };
      
      // Call the backend endpoint to generate test data
      const response = await axios.post('/api/time-logs/generate-test-data', {
        staffId: selectedEmployee._id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        // Generate a realistic work schedule (e.g., 8 hours/day for 21 work days)
        daysToGenerate: 21,
        hoursPerDay: 8,
        includeOvertimeInSomeDays: true
      }, config);
      
      if (response.data?.success) {
        toast.success(`Generated ${response.data.count} test time logs`);
        
        // Refresh the data to see the new logs
        fetchTimeLogs(selectedEmployee._id, startDate, endDate);
      } else {
        throw new Error('Failed to generate test data');
      }
    } catch (error) {
      console.error('Error generating test data:', error);
      toast.error(error.response?.data?.message || 'Failed to generate test data');
    } finally {
      setIsLoading(false);
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

  // Function to toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (showManualAdjustments && !isEditMode) {
      setShowManualAdjustments(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        colors={colors} 
      />
      <div 
        className="flex-1 transition-all duration-300"
        style={{
          marginLeft: isSidebarOpen && isDesktop ? (windowWidth >= 1920 ? '8rem' : '5rem') : '0',
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
              {/* Left Column: Employee List and Time Log History */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                {/* Employee List */}
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
                      >                        <div className="flex items-center gap-3">
                          <StaffAvatar 
                            imagePath={employee.profilePicture}
                            alt={`${employee.name}'s photo`}
                            size={40}
                            className="border rounded-sm"
                          />
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
                
                {/* Time Log History - Moved here with scroll functionality */}
                {selectedEmployee && (
                  <div className="rounded-lg p-4 shadow-sm" style={{ border: `1px solid ${colors.muted}` }}>
                    <h2 className="text-xl font-semibold mb-4" style={{ color: colors.primary }}>
                      <FiClock className="inline mr-2" />
                      Time Log History
                    </h2>
                    <div className="overflow-y-auto max-h-96" style={{ scrollbarWidth: 'thin' }}>
                      <TimeLogHistory
                        timeLogs={timeLogs}
                        colors={colors}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payroll Details */}
              <div className="lg:col-span-2">
                <div className="rounded-lg p-6 shadow-sm mb-6" style={{ border: `1px solid ${colors.muted}` }}>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold" style={{ color: colors.primary }}>
                      <FiCalendar className="inline mr-2" />
                      Payroll Period
                    </h2>
                    
                    {/* Test Data Generator Button - For testing only */}
                    <button
                      onClick={generateTestTimeLogData}
                      className="px-3 py-1 rounded text-sm font-medium flex items-center"
                      style={{ 
                        backgroundColor: '#666', 
                        color: 'white',
                        fontSize: '0.75rem'
                      }}
                      title="Generate test time log data for the selected period"
                    >
                      <FaWrench className="mr-1" />
                      Generate Test Data
                    </button>
                  </div>
                  
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
                      {/* Hours Summary - New Section */}
                      {hoursData && (
                        <div className="bg-opacity-10 p-4 rounded mb-6" style={{ backgroundColor: colors.secondary + '15' }}>
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="font-medium" style={{ color: colors.primary }}>
                              <FiClock className="inline mr-2" />
                              Working Hours Summary
                            </h3>
                            <button 
                              onClick={toggleEditMode}
                              className="px-3 py-1 rounded text-sm font-medium flex items-center"
                              style={{ 
                                backgroundColor: isEditMode ? colors.accent : colors.primary + '50', 
                                color: isEditMode ? 'white' : colors.primary
                              }}
                              title={isEditMode ? "View mode" : "Edit mode"}
                            >
                              <FiEdit className="mr-1" />
                              {isEditMode ? "View Mode" : "Edit Mode"}
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-2 rounded" style={{ backgroundColor: colors.primary + '15' }}>
                              <p className="text-sm" style={{ color: colors.muted }}>Regular Hours</p>
                              <p className="text-xl font-medium" style={{ color: colors.primary }}>
                                {hoursData.regularHours.toFixed(1)}
                              </p>
                            </div>
                            <div className="p-2 rounded" style={{ backgroundColor: colors.accent + '15' }}>
                              <p className="text-sm" style={{ color: colors.muted }}>Overtime Hours</p>
                              <p className="text-xl font-medium" style={{ color: colors.accent }}>
                                {hoursData.overtimeHours.toFixed(1)}
                              </p>
                            </div>
                            <div className="p-2 rounded" style={{ backgroundColor: colors.secondary + '15' }}>
                              <p className="text-sm" style={{ color: colors.muted }}>Total Hours</p>
                              <p className="text-xl font-medium" style={{ color: colors.secondary }}>
                                {hoursData.totalHours.toFixed(1)}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs mt-2 text-center" style={{ color: colors.muted }}>
                            Hours calculated from {hoursData.logs} time log entries for {formatDate(payrollPeriod)}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Attendance Section - Manual Adjustments (now view/edit mode) */}
                        <div className="p-3 rounded" style={{ backgroundColor: colors.muted + '10' }}>
                          <h3 className="font-medium mb-3" style={{ color: colors.secondary }}>
                            <FiClock className="inline mr-2" />
                            Manual Hours Adjustment
                          </h3>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span>Total Hours:</span>
                              {isEditMode ? (
                                <input
                                  type="number"
                                  value={attendance.totalHoursWorked}
                                  onChange={(e) => setAttendance({ ...attendance, totalHoursWorked: e.target.value })}
                                  className="w-24 p-1 text-right border rounded"
                                  style={{ borderColor: colors.muted }}
                                  min="0"
                                  placeholder={hoursData ? hoursData.totalHours.toString() : "0"}
                                />
                              ) : (
                                <span className="font-medium" style={{ color: colors.primary }}>
                                  {hoursData ? hoursData.totalHours.toFixed(2) : "0.00"}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Overtime Hours:</span>
                              {isEditMode ? (
                                <input
                                  type="number"
                                  value={attendance.overtimeHours}
                                  onChange={(e) => setAttendance({ ...attendance, overtimeHours: e.target.value })}
                                  className="w-24 p-1 text-right border rounded"
                                  style={{ borderColor: colors.muted }}
                                  min="0"
                                  placeholder={hoursData ? hoursData.overtimeHours.toString() : "0"}
                                />
                              ) : (
                                <span className="font-medium" style={{ color: colors.accent }}>
                                  {hoursData ? hoursData.overtimeHours.toFixed(2) : "0.00"}
                                </span>
                              )}
                            </div>
                            {isEditMode && (
                              <p className="text-xs italic" style={{ color: colors.accent }}>
                                Only adjust these values if time logs are incomplete or require manual correction
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Deductions Section */}
                        <div className="p-3 rounded" style={{ backgroundColor: colors.muted + '10' }}>
                          <h3 className="font-medium mb-3" style={{ color: colors.secondary }}>
                            <FiFileText className="inline mr-2" />
                            Deductions
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span>Late Minutes:</span>
                              {isEditMode ? (
                                <input
                                  type="number"
                                  value={deductions.lateMinutes}
                                  onChange={(e) => setDeductions({ ...deductions, lateMinutes: Number(e.target.value) })}
                                  className="w-24 p-1 text-right border rounded"
                                  style={{ borderColor: colors.muted }}
                                  min="0"
                                />
                              ) : (
                                <span className="font-medium" style={{ color: deductions.lateMinutes > 0 ? colors.accent : colors.primary }}>
                                  {deductions.lateMinutes}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Absences:</span>
                              {isEditMode ? (
                                <input
                                  type="number"
                                  value={deductions.absences}
                                  onChange={(e) => setDeductions({ ...deductions, absences: Number(e.target.value) })}
                                  className="w-24 p-1 text-right border rounded"
                                  style={{ borderColor: colors.muted }}
                                  min="0"
                                />
                              ) : (
                                <span className="font-medium" style={{ color: deductions.absences > 0 ? colors.accent : colors.primary }}>
                                  {deductions.absences}
                                </span>
                              )}
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
                          <span>Regular Hours Pay:</span>
                          <span>₱{calculateNetSalary().regularPay?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span>Overtime Pay:</span>
                          <span>₱{calculateNetSalary().overtimePay?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span>Allowances:</span>
                          <span>₱{selectedEmployee.allowances?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2" style={{ color: colors.accent }}>
                          <span>Deductions:</span>
                          <span>- ₱{(calculateNetSalary().lateDeduction + calculateNetSalary().absenceDeduction).toFixed(2)}</span>
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
                    {paymentHistory.length > 0 ? (
                      paymentHistory.map((payment) => (
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
                      ))
                    ) : (
                      <div className="text-center py-4" style={{ color: colors.muted }}>
                        No payment history available
                      </div>
                    )}
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

      <style>
        {`
        input[type='number']::-webkit-inner-spin-button,
        input[type='number']::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        /* Custom scrollbar styles */
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: ${colors.muted + '20'};
          border-radius: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: ${colors.primary + '40'};
          border-radius: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: ${colors.primary + '60'};
        }
        `}
      </style>
    </div>
  );
};

export default PayrollSystem;