import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiCalendar, FiClock, FiFileText, FiPrinter, FiEdit, FiGift, FiStar, FiDownload, FiLayers } from 'react-icons/fi';
import { PesoIconSimple } from './components/ui/PesoIconSimple';
import { FaWrench } from 'react-icons/fa';
import { default as WorkIDModal } from './WorkIDModal';
import TimeLogHistory from './components/TimeLogHistory';
import StaffAvatar from './components/StaffAvatar';
import PayrollSchedule from './components/PayrollSchedule';
import PayrollGenerator from './PayrollGenerator';
import PayrollHistory from './PayrollHistory';
import api from './services/apiService';
import { toast } from 'react-toastify';
import { useMultiTabLogout } from './hooks/useMultiTabLogout';
import { calculateAllGovernmentDeductions } from './utils/governmentDeductions';
import { generatePayslipPDF } from './utils/pdfGenerator';
import { businessDateKey } from './utils/businessDate';

const PayrollSystem = () => {  
  // Enable multi-tab logout synchronization
  useMultiTabLogout();
  
  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
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
  const [showManualAdjustments, setShowManualAdjustments] = useState(false);  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  
  // Holiday and bonus states
  const [holidayData, setHolidayData] = useState(null);
  const [thirteenthMonthData, setThirteenthMonthData] = useState(null);
  const [showHolidayDetails, setShowHolidayDetails] = useState(false);
  const [includeHolidayPay, setIncludeHolidayPay] = useState(true);
  const [include13thMonth, setInclude13thMonth] = useState(false);
  
  // Schedule attendance data
  const [scheduleAttendance, setScheduleAttendance] = useState(null);
  
  const [manualBonuses, setManualBonuses] = useState({
    performance: 0,
    other: 0
  });
  
  // Batch payroll generator view state
  const [showPayrollGenerator, setShowPayrollGenerator] = useState(false);
  const [showPayrollHistory, setShowPayrollHistory] = useState(false);
  
  // Global payroll settings (fallback when schedule doesn't have specific settings)
  const [globalPayrollSettings, setGlobalPayrollSettings] = useState(null);
  
  // Cached salary calculation result (updated whenever inputs change)
  const [calculatedSalary, setCalculatedSalary] = useState({ netPay: 0 });
  
    // Define fetchEmployees outside of useEffect so it can be called from other functions
  const fetchEmployees = async () => {
    try {
      // Add auth token to request headers
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };
        // Get staff with their payroll schedule information
      const { data } = await api.get('/api/staff?populate=payrollScheduleId', config);
      // Ensure data is an array before mapping
      if (!Array.isArray(data)) {
        throw new Error('Invalid staff data format');
      }
      
      // Filter out terminated, resigned, and suspended staff from payroll system
      const activeStaff = data.filter(emp => 
        !['Terminated', 'Resigned', 'Suspended'].includes(emp.status)
      );
      
      const formattedEmployees = activeStaff.map(emp => ({
        ...emp,
        // Use hourlyRate directly; fall back to dailyRate/8 for legacy records
        hourlyRate: Number(emp.hourlyRate) || (Number(emp.dailyRate) || 0) / 8,
        dailyRate: Number(emp.dailyRate) || (Number(emp.hourlyRate) || 0) * 8, // Keep for backward compatibility
        allowances: Number(emp.allowances) || 0
      }));
      setEmployees(formattedEmployees);
      
      // If we have a selected employee, refresh their data
      if (selectedEmployee) {
        const updatedEmployee = formattedEmployees.find(emp => emp._id === selectedEmployee._id);
        if (updatedEmployee) {
          setSelectedEmployee(updatedEmployee);
          
          // If this employee has a schedule, set it as selected
          if (updatedEmployee.payrollScheduleId) {
            setSelectedSchedule(updatedEmployee.payrollScheduleId);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch staff data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch employees from backend
  useEffect(() => {
    fetchEmployees();
    fetchGlobalPayrollSettings();
  }, []);

  // Fetch global payroll settings
  const fetchGlobalPayrollSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await api.get('/api/settings/payroll', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data?.success) {
        setGlobalPayrollSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching global payroll settings:', error);
      // Don't show error toast - global settings are optional fallback
    }
  };

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

          const { data } = await api.get(`/api/payroll/staff/${selectedEmployee._id}`, config);
          setPaymentHistory(Array.isArray(data.data) ? data.data : []);
        } catch (error) {
          console.error('Error fetching payment history:', error);
          toast.error(error.response?.data?.message || 'Failed to fetch payment history');
        }
      }
    };
    fetchPaymentHistory();  }, [selectedEmployee]);

  // Recalculate salary whenever inputs change
  useEffect(() => {
    const updateCalculation = async () => {
      const result = await calculateNetSalary();
      setCalculatedSalary(result);
    };
    
    if (selectedEmployee) {
      updateCalculation();
    }
  }, [
    selectedEmployee,
    attendance,
    deductions,
    hoursData,
    includeHolidayPay,
    holidayData,
    include13thMonth,
    thirteenthMonthData,
    manualBonuses,
    globalPayrollSettings
  ]);

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
      const logsResponse = await api.get(`/api/time-logs/staff/${staffId}?${params}`, config);
      
      if (!logsResponse.data?.success) {
        throw new Error('Failed to fetch time logs');
      }
      
      const logs = logsResponse.data.data || [];
      setTimeLogs(logs);
      
      // Fetch calculated hours data from the new endpoint
      const hoursResponse = await api.get(`/api/time-logs/staff/${staffId}/hours?${params}`, config);
      
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

  // Fetch schedule-based attendance data (absences, late minutes) from schedules
  const fetchScheduleAttendance = async (staffId, startDate, endDate) => {
    try {
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };
      
      const response = await api.get(`/api/schedules/compare/${staffId}`, {
        params: {
          startDate: businessDateKey(new Date(startDate)),
          endDate: businessDateKey(new Date(endDate))
        },
        ...config
      });
      
      const data = response.data?.data || response.data;
      if (data?.summary) {
        setScheduleAttendance(data.summary);
        // Auto-populate absences and late minutes from schedule data
        setDeductions(prev => ({
          ...prev,
          absences: data.summary.absentDays || 0,
          lateMinutes: data.summary.totalLateMinutes || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching schedule attendance:', error);
      setScheduleAttendance(null);
    }
  };

  // Salary calculation with flexible hours and bonuses
  const calculateNetSalary = async () => {
    if (!selectedEmployee) return { netPay: 0 };
  
    // Get values with proper validation
    // Use hourlyRate directly; fall back to dailyRate/8 for legacy records
    const hourlyRate = Number(selectedEmployee.hourlyRate) || (Number(selectedEmployee.dailyRate) || 0) / 8;
    const standardHoursPerDay = selectedEmployee.standardHoursPerDay || 8;
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
    
    // Get overtime multiplier - ALWAYS use Global Payroll Settings (schedule-level override is legacy/disabled)
    const globalOTMultiplier = globalPayrollSettings?.multipliers?.overtime;
    const overtimeMultiplier = globalOTMultiplier || 1.25;
    
    // DEBUG: Log calculation inputs
    console.log('[Payroll DEBUG] Calculation inputs:', {
      totalHours,
      overtimeHours,
      regularHours,
      hourlyRate,
      '>>> FINAL overtimeMultiplier': overtimeMultiplier,
      '>>> globalOTMultiplier (from Payroll Settings)': globalOTMultiplier
    });
    
    // Payment components - use hourlyRate directly
    const regularPay = regularHours * hourlyRate;
    const overtimePay = overtimeHours * (hourlyRate * overtimeMultiplier);
    
    console.log('[Payroll DEBUG] Calculation outputs:', {
      regularPay,
      overtimePay,
      formula: `${overtimeHours} * (${hourlyRate} * ${overtimeMultiplier}) = ${overtimePay}`
    });
    
    // Bonus calculations
    const holidayPay = (includeHolidayPay && holidayData) ? Number(holidayData.totalHolidayPay) || 0 : 0;
    const thirteenthMonthPay = (include13thMonth && thirteenthMonthData) ? Number(thirteenthMonthData.calculation.amount) || 0 : 0;
    const performanceBonus = Number(manualBonuses.performance) || 0;
    const otherBonus = Number(manualBonuses.other) || 0;
    const totalBonuses = holidayPay + thirteenthMonthPay + performanceBonus + otherBonus;
    
    // Deductions - use settings if available
    const lateMinutes = Number(deductions.lateMinutes) || 0;
    const absences = Number(deductions.absences) || 0;
    
    // Late deduction: ALWAYS use Global Payroll Settings (schedule-level override disabled)
    const globalLatePenalty = globalPayrollSettings?.deductions?.lateDeductionPerMinute;
    const lateDeductionPerMinute = globalLatePenalty;
    
    let lateDeduction = 0;
    if (lateDeductionPerMinute !== undefined && lateDeductionPerMinute > 0) {
      lateDeduction = lateMinutes * lateDeductionPerMinute;
    } else {
      lateDeduction = lateMinutes * (hourlyRate / 60); // Fallback to hourly rate method
    }
    
    // Absence deduction: ALWAYS use Global Payroll Settings (schedule-level override disabled)
    const globalAbsentType = globalPayrollSettings?.deductions?.absentDeductionType;
    const absentDeductionType = globalAbsentType || 'daily_rate';
    
    let absenceDeduction = 0;
    if (absentDeductionType === 'daily_rate') {
      absenceDeduction = absences * hourlyRate * standardHoursPerDay;
    } else if (absentDeductionType === 'hourly') {
      absenceDeduction = absences * hourlyRate * standardHoursPerDay;
    } else if (absentDeductionType === 'none') {
      absenceDeduction = 0;
    }
    
    // Calculate government deductions based on MONTHLY SALARY (not period gross)
    // For hourly employees: Monthly Salary = hourlyRate × 208 hours (8 hrs/day × 26 days)
    // This is the standard Philippine payroll formula for SSS/PhilHealth/Pag-IBIG
    const monthlySalary = hourlyRate * 208;
    const govtDeductions = await calculateAllGovernmentDeductions(monthlySalary, selectedEmployee);
    
    // Total deductions use employee share only (totals.employeeTotal)
    const totalDeductions = lateDeduction + absenceDeduction + govtDeductions.totals.employeeTotal;

    // Net pay calculation
    const netPay = (
      regularPay +
      overtimePay +
      allowances +
      totalBonuses -
      totalDeductions
    );

    return {
      netPay: isNaN(netPay) ? 0 : Number(netPay.toFixed(2)),
      regularPay,
      overtimePay,
      holidayPay,
      thirteenthMonthPay,
      performanceBonus,
      otherBonus,
      totalBonuses,
      lateDeduction,
      absenceDeduction,
      // Employee deductions (deducted from pay)
      sssDeduction: govtDeductions.sss.employeeAmount,
      philHealthDeduction: govtDeductions.philHealth.employeeAmount,
      pagIbigDeduction: govtDeductions.pagIbig.employeeAmount,
      governmentDeductions: govtDeductions.totals.employeeTotal,
      totalDeductions,
      allowances,
      hourlyRate, // NEW: Primary rate field
      dailyRate: hourlyRate * standardHoursPerDay, // Computed for backward compatibility
      regularHours,
      overtimeHours,
      totalHours,
      // Full deduction details including employer shares for display
      govtDeductionsDetail: govtDeductions,
      // Employer contributions (company expense, for display/reporting)
      employerContributions: govtDeductions.employerBreakdown,
      employerTotal: govtDeductions.totals.employerTotal,
      // Contribution basis for compliance
      contributionBasis: govtDeductions.contributionBasis
    };
  };
  // Handle payroll submission
  const handlePayslipGeneration = async () => {
    if (!selectedEmployee || !payrollPeriod) return;

    try {
      const { 
        netPay, regularPay, overtimePay, 
        holidayPay, thirteenthMonthPay, performanceBonus, otherBonus,
        lateDeduction, absenceDeduction,
        sssDeduction, philHealthDeduction, pagIbigDeduction,
        regularHours, overtimeHours, totalHours
      } = await calculateNetSalary();

      // Add auth token to request headers
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };

      // Use the new create-with-bonuses endpoint
      const { data } = await api.post('/api/payroll/create-with-bonuses', {
        staffId: selectedEmployee._id,
        payrollPeriod: new Date(payrollPeriod),
        basicPay: regularPay,
        overtimePay,
        totalHoursWorked: totalHours,
        overtimeHours,
        allowances: selectedEmployee.allowances,
        holidayPay: includeHolidayPay ? holidayPay : 0,
        thirteenthMonthPay: include13thMonth ? thirteenthMonthPay : 0,
        bonuses: {
          holiday: includeHolidayPay ? holidayPay : 0,
          performance: performanceBonus,
          other: otherBonus
        },
        holidaysWorked: (includeHolidayPay && holidayData?.holidaysInPeriod) ? 
          holidayData.holidaysInPeriod.map(holiday => ({
            date: holiday.date,
            name: holiday.name,
            type: holiday.type,
            multiplier: holiday.multiplier,
            pay: holiday.pay || 0
          })) : [],
        deductions: {
          late: lateDeduction,
          absence: absenceDeduction,
          sss: sssDeduction,
          philHealth: philHealthDeduction,
          pagIbig: pagIbigDeduction
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
      const response = await api.post('/api/time-logs/generate-test-data', {
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

  const handleDownloadPayslipPDF = async (paymentId) => {
    try {
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      const response = await api.get(`/api/staff/payslip/${paymentId}`, config);
      
      if (response.data.success) {
        generatePayslipPDF(response.data.data);
        toast.success('Payslip PDF downloaded successfully');
      }
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast.error('Failed to download payslip');
    }
  };

  // Function to toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    if (showManualAdjustments && !isEditMode) {
      setShowManualAdjustments(false);
    }
  };

  // Handle schedule selection
  const handleScheduleSelect = (schedule) => {
    setSelectedSchedule(schedule);
    setShowScheduleModal(false);
    
    // If we have a selected employee, update their payroll schedule
    if (selectedEmployee && schedule) {
      updateEmployeeSchedule(selectedEmployee._id, schedule._id);
    }
    
    toast.success(`Payroll schedule "${schedule.name}" selected`);
  };
    // Update employee's payroll schedule
  const updateEmployeeSchedule = async (employeeId, scheduleId) => {
    try {
      // Add auth token to request headers
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };

      await api.put(`/api/staff/${employeeId}`, {
        payrollScheduleId: scheduleId
      }, config);
      
      // Refresh employees list to get updated data
      fetchEmployees();
    } catch (error) {
      console.error('Error updating employee schedule:', error);
      toast.error(error.response?.data?.message || 'Failed to update employee schedule');
    }
  };

  // Fetch holiday pay calculations
  const fetchHolidayData = async (staffId, startDate, endDate) => {
    try {
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };

      const response = await api.post('/api/payroll/calculate-holiday-pay', {
        staffId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }, config);

      if (response.data?.success) {
        setHolidayData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching holiday data:', error);
      setHolidayData(null);
    }
  };

  // Fetch 13th month pay calculation
  const fetch13thMonthData = async (staffId, year) => {
    try {
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };

      const response = await api.post('/api/payroll/calculate-13th-month', {
        staffId,
        year
      }, config);

      if (response.data?.success) {
        setThirteenthMonthData(response.data.data);
        // Auto-enable 13th month pay if it's December
        if (response.data.data.calculation.isPayoutPeriod) {
          setInclude13thMonth(true);
        }
      }
    } catch (error) {
      console.error('Error fetching 13th month data:', error);
      setThirteenthMonthData(null);
    }
  };

  // Enhanced useEffect to fetch bonus data when employee and period change
  useEffect(() => {
    if (selectedEmployee && payrollPeriod) {
      const startDate = new Date(payrollPeriod);
      startDate.setDate(1); // Start of month
      const endDate = new Date(payrollPeriod);
      endDate.setMonth(endDate.getMonth() + 1, 0); // End of month
      
      fetchTimeLogs(selectedEmployee._id, startDate, endDate);
      
      // Fetch schedule-based attendance (absences, late minutes)
      fetchScheduleAttendance(selectedEmployee._id, startDate, endDate);
      
      // Fetch holiday data for the current period
      fetchHolidayData(selectedEmployee._id, startDate, endDate);
      
      // Fetch 13th month data for current year
      const currentYear = new Date(payrollPeriod).getFullYear();
      fetch13thMonthData(selectedEmployee._id, currentYear);
    }
  }, [selectedEmployee, payrollPeriod]);
  return (
    <motion.div 
      className="flex min-h-screen" 
      style={{ backgroundColor: colors.background }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div 
        className="flex-1 transition-all duration-300"
        style={{
          marginLeft: getMainContentMargin(),
          paddingTop: windowWidth < 768 ? '4rem' : '0'
        }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      ><div className="p-6 md:p-8 pt-24 md:pt-8">
          {showPayrollHistory ? (
            <PayrollHistory 
              onBack={() => setShowPayrollHistory(false)}
              onCreateNew={() => {
                setShowPayrollHistory(false);
                setShowPayrollGenerator(true);
              }}
              colors={colors}
            />
          ) : showPayrollGenerator ? (
            <PayrollGenerator 
              onBack={() => setShowPayrollGenerator(false)}
              colors={colors}
            />
          ) : (
            <>
              <h1 className="text-3xl font-bold mb-6" style={{ color: colors.primary }}>
                <PesoIconSimple width={16} height={16} className="inline mr-2" />
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
                      <div className="flex gap-2">
                      <button
                        onClick={() => setShowPayrollHistory(true)}
                        className="px-3 py-1 rounded text-sm font-medium flex items-center"
                        style={{ 
                          backgroundColor: colors.primary, 
                          color: 'white',
                          fontSize: '0.75rem'
                        }}
                        title="View payroll history, drafts, and create new batches"
                      >
                        <FiLayers className="mr-1" />
                        Batch Payroll
                      </button>
                      
                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="px-3 py-1 rounded text-sm font-medium flex items-center"
                        style={{ 
                          backgroundColor: colors.secondary, 
                          color: 'white',
                          fontSize: '0.75rem',
                          display: 'none' // Hidden: Individual schedules disabled
                        }}
                        title="Manage payroll schedules"
                      >
                        <FiCalendar className="mr-1" />
                        Manage Schedules
                      </button>
                        <button
                        onClick={generateTestTimeLogData}
                        className="px-3 py-1 rounded text-sm font-medium flex items-center hidden"
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
                      {/* Schedule Information - HIDDEN: Individual schedules disabled, Global Payroll Settings enforced */}
                      <div style={{ display: 'none' }} className="bg-opacity-10 p-4 rounded mb-4">
                        <div className="text-sm p-3 rounded" style={{ backgroundColor: colors.muted + '20', color: colors.muted }}>
                          ℹ️ Individual schedules disabled. All staff use Global Payroll Settings.
                        </div>
                      </div>
                    
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
                            {scheduleAttendance && (
                              <span className="text-xs font-normal ml-2" style={{ color: colors.accent }}>
                                (from schedules)
                              </span>
                            )}
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
                              )}                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bonuses and Holiday Pay Section */}
                      <div className="p-3 rounded mb-4" style={{ backgroundColor: colors.secondary + '10' }}>
                        <h3 className="font-medium mb-3" style={{ color: colors.secondary }}>
                          <FiGift className="inline mr-2" />
                          Bonuses & Holiday Pay
                        </h3>
                        
                        {/* Holiday Pay Controls */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="includeHolidayPay"
                                checked={includeHolidayPay}
                                onChange={(e) => setIncludeHolidayPay(e.target.checked)}
                                className="mr-2"
                              />
                              <label htmlFor="includeHolidayPay" className="font-medium">
                                Include Holiday Pay
                              </label>
                            </div>
                            {holidayData && (
                              <button
                                onClick={() => setShowHolidayDetails(!showHolidayDetails)}
                                className="text-sm px-2 py-1 rounded"
                                style={{ 
                                  backgroundColor: colors.accent + '20',
                                  color: colors.accent
                                }}
                              >
                                {showHolidayDetails ? 'Hide Details' : 'Show Details'}
                              </button>
                            )}
                          </div>
                          
                          {holidayData && (
                            <div className="text-sm" style={{ color: colors.muted }}>
                              Found {holidayData.holidaysInPeriod?.length || 0} holidays in period
                              {includeHolidayPay && (
                                <span className="ml-2 font-medium" style={{ color: colors.secondary }}>
                                  (₱{holidayData.totalHolidayPay?.toFixed(2) || '0.00'})
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Holiday Details Expandable */}
                          {showHolidayDetails && holidayData?.holidaysInPeriod && (
                            <div className="mt-2 p-2 rounded" style={{ backgroundColor: colors.background }}>
                              <h4 className="text-sm font-medium mb-2" style={{ color: colors.primary }}>
                                Holiday Details:
                              </h4>
                              {holidayData.holidaysInPeriod.map((holiday, index) => (
                                <div key={index} className="text-xs mb-1 flex justify-between">
                                  <span>{holiday.name} ({new Date(holiday.date).toLocaleDateString()})</span>
                                  <span style={{ color: colors.accent }}>
                                    {holiday.multiplier}x - ₱{(holiday.pay || 0).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 13th Month Pay Controls */}
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="include13thMonth"
                                checked={include13thMonth}
                                onChange={(e) => setInclude13thMonth(e.target.checked)}
                                className="mr-2"
                              />
                              <label htmlFor="include13thMonth" className="font-medium">
                                Include 13th Month Pay
                              </label>
                            </div>
                            {thirteenthMonthData?.calculation.isPayoutPeriod && (
                              <span className="text-xs px-2 py-1 rounded" style={{ 
                                backgroundColor: colors.accent + '20',
                                color: colors.accent
                              }}>
                                Payout Period
                              </span>
                            )}
                          </div>
                          
                          {thirteenthMonthData && (
                            <div className="text-sm" style={{ color: colors.muted }}>
                              Annual Basic: ₱{thirteenthMonthData.calculation.annualBasicSalary?.toFixed(2) || '0.00'}
                              {include13thMonth && (
                                <span className="ml-2 font-medium" style={{ color: colors.secondary }}>
                                  (₱{thirteenthMonthData.calculation.amount?.toFixed(2) || '0.00'})
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Manual Bonuses */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium" style={{ color: colors.primary }}>
                            <FiStar className="inline mr-1" />
                            Additional Bonuses
                          </h4>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm" style={{ color: colors.muted }}>
                                Performance Bonus:
                              </label>
                              <input
                                type="number"
                                value={manualBonuses.performance}
                                onChange={(e) => setManualBonuses({
                                  ...manualBonuses, 
                                  performance: Number(e.target.value) || 0
                                })}
                                className="w-full p-1 mt-1 border rounded text-right"
                                style={{ borderColor: colors.muted }}
                                min="0"
                                placeholder="0.00"
                              />
                            </div>
                            
                            <div>
                              <label className="text-sm" style={{ color: colors.muted }}>
                                Other Bonus:
                              </label>
                              <input
                                type="number"
                                value={manualBonuses.other}
                                onChange={(e) => setManualBonuses({
                                  ...manualBonuses, 
                                  other: Number(e.target.value) || 0
                                })}
                                className="w-full p-1 mt-1 border rounded text-right"
                                style={{ borderColor: colors.muted }}
                                min="0"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        </div>
                      </div>                      {/* Pay Breakdown */}
                      <div className="bg-opacity-10 p-4 rounded mb-4" style={{ backgroundColor: colors.accent + '15' }}>
                        <div className="flex justify-between items-center mb-2">
                          <span>Hourly Rate:</span>
                          <span>₱{(selectedEmployee.hourlyRate || (selectedEmployee.dailyRate / 8))?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span>Regular Hours Pay:</span>
                          <span>₱{calculatedSalary.regularPay?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span>Overtime Pay:</span>
                          <span>₱{calculatedSalary.overtimePay?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span>Allowances:</span>
                          <span>₱{selectedEmployee.allowances?.toFixed(2)}</span>
                        </div>
                        
                        {/* Bonus Breakdown */}
                        {(calculatedSalary.holidayPay > 0 || calculatedSalary.thirteenthMonthPay > 0 || 
                          calculatedSalary.performanceBonus > 0 || calculatedSalary.otherBonus > 0) && (
                          <>
                            <hr className="my-2" style={{ borderColor: colors.muted + '30' }} />
                            {calculatedSalary.holidayPay > 0 && (
                              <div className="flex justify-between items-center mb-2" style={{ color: colors.secondary }}>
                                <span>Holiday Pay:</span>
                                <span>₱{calculatedSalary.holidayPay?.toFixed(2)}</span>
                              </div>
                            )}
                            {calculatedSalary.thirteenthMonthPay > 0 && (
                              <div className="flex justify-between items-center mb-2" style={{ color: colors.secondary }}>
                                <span>13th Month Pay:</span>
                                <span>₱{calculatedSalary.thirteenthMonthPay?.toFixed(2)}</span>
                              </div>
                            )}
                            {calculatedSalary.performanceBonus > 0 && (
                              <div className="flex justify-between items-center mb-2" style={{ color: colors.secondary }}>
                                <span>Performance Bonus:</span>
                                <span>₱{calculatedSalary.performanceBonus?.toFixed(2)}</span>
                              </div>
                            )}
                            {calculatedSalary.otherBonus > 0 && (
                              <div className="flex justify-between items-center mb-2" style={{ color: colors.secondary }}>
                                <span>Other Bonus:</span>
                                <span>₱{calculatedSalary.otherBonus?.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between items-center mb-2 font-medium" style={{ color: colors.secondary }}>
                              <span>Total Bonuses:</span>
                              <span>₱{calculatedSalary.totalBonuses?.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        
                        {/* Deductions Section */}
                        <div className="border-t border-gray-200 pt-3 mt-3">
                          <div className="flex justify-between items-center mb-3 font-medium" style={{ color: colors.accent }}>
                            <span>Deductions</span>
                            <span>- ₱{calculatedSalary.totalDeductions?.toFixed(2)}</span>
                          </div>
                          
                          {/* Attendance Deductions */}
                          {(calculatedSalary.lateDeduction > 0 || calculatedSalary.absenceDeduction > 0) && (
                            <div className="ml-4 mb-3">
                              <div className="text-sm font-medium mb-1" style={{ color: colors.secondary }}>Attendance Deductions:</div>
                              {calculatedSalary.lateDeduction > 0 && (
                                <div className="flex justify-between items-center text-sm mb-1" style={{ color: colors.secondary }}>
                                  <span className="ml-2">Late:</span>
                                  <span>- ₱{calculatedSalary.lateDeduction?.toFixed(2)}</span>
                                </div>
                              )}
                              {calculatedSalary.absenceDeduction > 0 && (
                                <div className="flex justify-between items-center text-sm mb-1" style={{ color: colors.secondary }}>
                                  <span className="ml-2">Absence:</span>
                                  <span>- ₱{calculatedSalary.absenceDeduction?.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Government Deductions */}
                          {calculatedSalary.governmentDeductions > 0 && (
                            <div className="ml-4 mb-3">
                              <div className="text-sm font-medium mb-1" style={{ color: colors.secondary }}>Government Deductions:</div>
                              {calculatedSalary.sssDeduction > 0 && selectedEmployee.sssNumber && (
                                <div className="flex justify-between items-center text-sm mb-1" style={{ color: colors.secondary }}>
                                  <span className="ml-2">
                                    SSS (5%)
                                    <span className="text-xs ml-1" title={`SSS#: ${selectedEmployee.sssNumber}`}>✓</span>
                                  </span>
                                  <span>- ₱{calculatedSalary.sssDeduction?.toFixed(2)}</span>
                                </div>
                              )}
                              {calculatedSalary.philHealthDeduction > 0 && selectedEmployee.philHealthNumber && (
                                <div className="flex justify-between items-center text-sm mb-1" style={{ color: colors.secondary }}>
                                  <span className="ml-2">
                                    PhilHealth (2.5%)
                                    <span className="text-xs ml-1" title={`PhilHealth#: ${selectedEmployee.philHealthNumber}`}>✓</span>
                                  </span>
                                  <span>- ₱{calculatedSalary.philHealthDeduction?.toFixed(2)}</span>
                                </div>
                              )}
                              {calculatedSalary.pagIbigDeduction > 0 && selectedEmployee.pagIbigNumber && (
                                <div className="flex justify-between items-center text-sm mb-1" style={{ color: colors.secondary }}>
                                  <span className="ml-2">
                                    Pag-IBIG (2%)
                                    <span className="text-xs ml-1" title={`Pag-IBIG#: ${selectedEmployee.pagIbigNumber}`}>✓</span>
                                  </span>
                                  <span>- ₱{calculatedSalary.pagIbigDeduction?.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Missing Government IDs Notice */}
                          {(!selectedEmployee.sssNumber || !selectedEmployee.philHealthNumber || !selectedEmployee.pagIbigNumber) && (
                            <div className="ml-4 mb-2 text-xs" style={{ color: colors.accent, opacity: 0.7 }}>
                              <span>Note: </span>
                              {!selectedEmployee.sssNumber && <span>SSS </span>}
                              {!selectedEmployee.philHealthNumber && <span>PhilHealth </span>}
                              {!selectedEmployee.pagIbigNumber && <span>Pag-IBIG </span>}
                              deduction(s) not applied (no ID on file)
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center font-semibold pt-2">
                          <span style={{ color: colors.secondary }}>Net Pay:</span>
                          <span style={{ color: colors.secondary }}>
                            ₱{calculatedSalary.netPay.toFixed(2)}
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
                          className="p-3 rounded flex justify-between items-center gap-4"
                          style={{ 
                            backgroundColor: colors.background, 
                            border: `1px solid ${colors.muted}` 
                          }}
                        >
                          <div className="flex-1">
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
                          <button
                            onClick={() => handleDownloadPayslipPDF(payment._id)}
                            className="p-2 rounded-lg transition-opacity hover:opacity-80"
                            style={{ backgroundColor: colors.accent, color: 'white' }}
                            title="Download PDF"
                          >
                            <FiDownload size={18} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4" style={{ color: colors.muted }}>
                        No payment history available
                      </div>
                    )}
                  </div>                </div>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </motion.div>

      {/* Work ID Modal */}
      {isModalOpen && selectedEmployee && (
        <WorkIDModal 
          staff={selectedEmployee} 
          onClose={() => setIsModalOpen(false)} 
          colors={colors} 
        />
      )}
      
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-11/12 md:w-3/4 lg:w-2/3 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: colors.primary }}>
                <FiCalendar className="inline mr-2" />
                Payroll Schedule Management
              </h2>
              <button 
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <PayrollSchedule 
              colors={colors} 
              onScheduleSelect={handleScheduleSelect}
            />
          </div>
        </div>
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
    </motion.div>
  );
};

export default PayrollSystem;

