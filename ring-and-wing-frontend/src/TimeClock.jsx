import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiUser, FiClock, FiSearch, FiCamera, FiCheck, FiX, FiArrowLeft, FiCreditCard, FiWifi, FiUsers, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import api from './services/apiService';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Webcam from 'react-webcam';
import { API_URL } from './App';
import { motion, AnimatePresence } from 'framer-motion';
import StaffAvatar from './components/StaffAvatar';
import { useMultiTabLogout } from './hooks/useMultiTabLogout';
import BrandedLoadingScreen from './components/ui/BrandedLoadingScreen';

const TimeClock = () => {  
  // Enable multi-tab logout synchronization
  useMultiTabLogout();
  
  // Colors for consistent styling
  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };

  // Layout state
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showStaffPanel, setShowStaffPanel] = useState(false); // Staff panel hidden by default

  // Attendance mode state
  const [attendanceMode, setAttendanceMode] = useState('PIN'); // 'PIN' or 'NFC'
  const [nfcTestMode, setNfcTestMode] = useState(true);
  const [nfcTapAndGo, setNfcTapAndGo] = useState(false); // false = confirm modal, true = instant clock
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Staff data
  const [staff, setStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastLog, setLastLog] = useState(null);
  const [currentTime, setCurrentTime] = useState('');

  // PIN and photo capture state
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [clockAction, setClockAction] = useState(null); // 'in' or 'out'
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const webcamRef = useRef(null);

  // NFC Test Mode state - dropdown selection
  const [selectedNfcCard, setSelectedNfcCard] = useState('');
  const [staffWithNfc, setStaffWithNfc] = useState([]);
  const [showNfcTestModal, setShowNfcTestModal] = useState(false);
  const [nfcTestStaffStatus, setNfcTestStaffStatus] = useState(null); // { staff, isClockedIn }
  
  // NFC Real Mode state - listening for cards
  const [nfcListening, setNfcListening] = useState(false);
  const [lastNfcAction, setLastNfcAction] = useState(null); // Store last NFC action result
  
  // Recent activities for selected staff
  const [recentActivities, setRecentActivities] = useState([]);

  // Fetch attendance settings on mount
  useEffect(() => {
    const fetchAttendanceSettings = async () => {
      try {
        const response = await api.get('/api/settings/attendance');
        if (response.data?.success) {
          setAttendanceMode(response.data.data.mode || 'PIN');
          setNfcTestMode(response.data.data.nfcSettings?.testMode ?? true);
          setNfcTapAndGo(response.data.data.nfcSettings?.tapAndGo ?? false);
        }
      } catch (error) {
        console.error('Error fetching attendance settings:', error);
        // Default to PIN mode if settings fetch fails
        setAttendanceMode('PIN');
      } finally {
        setLoadingSettings(false);
      }
    };
    
    fetchAttendanceSettings();
  }, []);

  // Filter staff with NFC cards for test mode dropdown
  useEffect(() => {
    const staffWithCards = staff.filter(s => s.nfcCardId && s.nfcCardId.trim() !== '');
    setStaffWithNfc(staffWithCards);
  }, [staff]);

  // Start NFC listening when in NFC mode (non-test)
  useEffect(() => {
    if (attendanceMode === 'NFC' && !nfcTestMode && !loadingSettings) {
      setNfcListening(true);
    } else {
      setNfcListening(false);
    }
  }, [attendanceMode, nfcTestMode, loadingSettings]);

  // Keyboard Wedge NFC Reader Support
  // Detects rapid keystrokes from HID NFC readers (not normal typing)
  useEffect(() => {
    // Only enable in NFC mode when not in test mode
    if (attendanceMode !== 'NFC' || nfcTestMode || loadingSettings) {
      return;
    }

    let keyBuffer = '';
    let lastKeyTime = 0;
    const MAX_KEY_INTERVAL = 50; // Max ms between keystrokes (readers are fast, ~10-30ms)
    const MIN_CARD_LENGTH = 4;   // Minimum valid card ID length
    const MAX_CARD_LENGTH = 14;  // Maximum valid card ID length
    const BUFFER_TIMEOUT = 100;  // Clear buffer after 100ms of no input
    let bufferTimer = null;

    const handleKeyDown = (e) => {
      const now = Date.now();
      
      // Ignore if user is typing in an input field (except our hidden NFC input)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (!e.target.dataset.nfcCapture) {
          return;
        }
      }

      // Check if this keystroke is part of rapid input (NFC reader)
      const timeSinceLastKey = now - lastKeyTime;
      
      // If too slow (human typing), reset buffer
      if (timeSinceLastKey > MAX_KEY_INTERVAL && keyBuffer.length > 0) {
        keyBuffer = '';
      }

      lastKeyTime = now;

      // Clear any pending buffer timeout
      if (bufferTimer) {
        clearTimeout(bufferTimer);
      }

      // Handle Enter key - submit the buffer if valid
      if (e.key === 'Enter') {
        e.preventDefault();
        
        const cardId = keyBuffer.trim().toUpperCase();
        
        // Validate: must be rapid input AND valid length AND alphanumeric
        if (cardId.length >= MIN_CARD_LENGTH && 
            cardId.length <= MAX_CARD_LENGTH && 
            /^[A-F0-9]+$/i.test(cardId)) {
          console.log('[NFC Reader] Card detected:', cardId);
          handleNfcCardTap(cardId);
        }
        
        keyBuffer = '';
        return;
      }

      // Only accept hex characters (0-9, A-F) - typical for NFC card IDs
      if (/^[a-fA-F0-9]$/.test(e.key)) {
        keyBuffer += e.key;
        
        // Safety: prevent buffer overflow
        if (keyBuffer.length > MAX_CARD_LENGTH) {
          keyBuffer = keyBuffer.slice(-MAX_CARD_LENGTH);
        }
      }

      // Set timeout to clear buffer if no more input
      bufferTimer = setTimeout(() => {
        keyBuffer = '';
      }, BUFFER_TIMEOUT);
    };

    // Add global listener
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (bufferTimer) {
        clearTimeout(bufferTimer);
      }
    };
  }, [attendanceMode, nfcTestMode, loadingSettings]);

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initialize on component mount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getMainContentMargin = () => {
    if (windowWidth < 768) return '0';
    return windowWidth >= 1920 ? '8rem' : '5rem';
  };

  // Update current time every minute
  useEffect(() => {
    updateCurrentTime();
    const intervalId = setInterval(updateCurrentTime, 60000);
    return () => clearInterval(intervalId);
  }, []);
  
  const updateCurrentTime = () => {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    setCurrentTime(`${hours}:${minutes} ${ampm}`);
  };

  // Fetch all staff
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await api.get('/api/staff/time-clock');
        const staffData = Array.isArray(response.data) ? response.data : 
                        (response.data.data ? response.data.data : []);
        setStaff(staffData);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast.error('Failed to fetch staff data');
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  // Fetch time logs when staff is selected
  useEffect(() => {
    if (selectedStaff) {
      fetchLastTimeLog(selectedStaff._id);
      fetchRecentActivities(selectedStaff._id);
    } else {
      setLastLog(null);
      setRecentActivities([]);
    }
  }, [selectedStaff]);

  const fetchLastTimeLog = async (staffId) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const params = new URLSearchParams({ 
        startDate: today.toISOString(),
        endDate: new Date().toISOString()
      }).toString();

      // Add authorization token to the request
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };

      const { data } = await api.get(`/api/time-logs/staff/${staffId}?${params}`, config);
      
      if (data?.data?.length > 0) {
        const formattedTimestamp = formatDateTime(data.data[0].timestamp || data.data[0].createdAt);
        setLastLog({
          ...data.data[0],
          formattedTimestamp
        });
      } else {
        setLastLog(null);
      }
    } catch (error) {
      console.error('Error fetching time logs:', error);
      setLastLog(null);
    }
  };

  // Fetch recent activities (last 7 days)
  const fetchRecentActivities = async (staffId) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const params = new URLSearchParams({ 
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }).toString();

      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };

      const { data } = await api.get(`/api/time-logs/staff/${staffId}?${params}`, config);
      
      if (data?.data?.length > 0) {
        setRecentActivities(data.data.slice(0, 10)); // Get last 10 activities
      } else {
        setRecentActivities([]);
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setRecentActivities([]);
    }
  };

  // Function to capture photo from webcam
  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    setCapturedImage(imageSrc);
  }, [webcamRef]);

  // Function to handle clock button clicks
  const handleClockButtonClick = (type) => {
    if (!selectedStaff?._id) {
      toast.error('Please select a staff member first');
      return;
    }
    
    // In NFC mode, show "tap card again" modal instead of PIN entry
    if (attendanceMode === 'NFC') {
      setClockAction(type);
      setShowNfcTapAgainModal(true);
      return;
    }
    
    setClockAction(type);
    setShowPinEntry(true);
    setPinInput('');
    setShowCamera(false);
    setCapturedImage(null);
  };

  // NFC "Tap Again" modal state
  const [showNfcTapAgainModal, setShowNfcTapAgainModal] = useState(false);

  // Function to handle PIN verification
  const handlePinVerify = () => {
    if (pinInput.length < 4) {
      toast.error('Please enter a valid PIN');
      return;
    }

    if (selectedStaff.pinCode !== pinInput) {
      toast.error('Invalid PIN code');
      setPinInput('');
      return;
    }

    // PIN is valid, proceed to photo capture
    setShowCamera(true);
  };
  
  // Function to go back to PIN entry from camera
  const handleBackToPin = () => {
    setShowCamera(false);
    setCapturedImage(null);
  };

  // Function to reset the clock interface
  const handleCancelClock = () => {
    setShowPinEntry(false);
    setShowCamera(false);
    setCapturedImage(null);
    setPinInput('');
  };

  // Function to handle time log submission with photo
  const handleTimeLog = async () => {
    if (!selectedStaff?._id || !capturedImage) {
      toast.error('Please select a staff member and take a photo');
      return;
    }
    
    setLoading(true);
    try {
      // Convert base64 image to file
      const blob = await fetch(capturedImage).then(res => res.blob());
      const fileName = `${selectedStaff._id}-${Date.now()}.jpg`;
      const photoFile = new File([blob], fileName, { type: 'image/jpeg' });
      
      // Create form data
      const formData = new FormData();
      formData.append('staffId', selectedStaff._id);
      formData.append('pinCode', pinInput);
      formData.append('photo', photoFile);
      
      // Add authorization headers
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };
      
      // Send API request with photo
      const { data } = await api.post(
        `/api/time-logs/${clockAction === 'in' ? 'clock-in' : 'clock-out'}`, 
        formData,
        config
      );
      
      if (!data.success) {
        throw new Error(`Failed to clock ${clockAction}`);
      }

      const formattedTime = formatDateTime(data.data.timestamp || data.data.createdAt);
      setLastLog({
        ...data.data,
        formattedTimestamp: formattedTime
      });
      
      // Reset states first before showing success toast
      handleCancelClock();
      
      // Clear any existing toasts with the same ID first
      toast.dismiss(`clock-${clockAction}-${selectedStaff._id}`);
      
      // Show a single toast notification with a consistent ID based on staff ID
      toast.success(`${selectedStaff.name} clocked ${clockAction} successfully`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        toastId: `clock-${clockAction}-${selectedStaff._id}`, // Use consistent ID based on staff
      });
      
      updateCurrentTime();
      
      // Refresh the time log data
      fetchLastTimeLog(selectedStaff._id);
    } catch (error) {
      console.error('Time logging error:', error);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  // NFC Functions - Updated for Test Mode Dropdown
  const handleNfcTestAction = async (action, cardIdOverride = null) => {
    const cardId = cardIdOverride || selectedNfcCard;
    
    if (!cardId) {
      toast.error('No NFC card specified');
      return;
    }

    setLoading(true);
    try {
      const endpoint = action === 'in' 
        ? '/api/time-logs/nfc/clock-in' 
        : '/api/time-logs/nfc/clock-out';
      
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };

      const { data } = await api.post(endpoint, { 
        nfcCardId: cardId 
      }, config);
      
      if (!data.success) {
        throw new Error(data.message || `Failed to clock ${action}`);
      }

      // Find staff member for profile picture
      const foundStaff = staff.find(s => s.nfcCardId === cardId);

      // Show success toast with staff name from response
      toast.success(data.message || `${data.data?.staffName || 'Staff'} clocked ${action} successfully`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });

      // Store last action result for display (shows in NFC Live mode)
      setLastNfcAction({
        staffName: data.data?.staffName,
        type: action,
        timestamp: new Date().toISOString(),
        totalHours: data.data?.totalHours,
        profilePicture: foundStaff?.profilePicture
      });
      if (foundStaff) {
        setSelectedStaff(foundStaff);
        fetchLastTimeLog(foundStaff._id);
        fetchRecentActivities(foundStaff._id);
      }

      // Close modals and reset selection
      setShowNfcTestModal(false);
      setShowNfcTapAgainModal(false);
      setNfcTestStaffStatus(null);
      setSelectedNfcCard('');
      
      updateCurrentTime();
    } catch (error) {
      console.error('NFC test clock error:', error);
      toast.error(error.response?.data?.message || error.message || 'NFC clock action failed');
    } finally {
      setLoading(false);
    }
  };

  // NFC Test Mode - Open modal and detect status when card is selected
  const handleNfcCardSelect = async (cardId) => {
    setSelectedNfcCard(cardId);
    if (!cardId) {
      setShowNfcTestModal(false);
      setNfcTestStaffStatus(null);
      return;
    }

    // Look up staff status
    try {
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };

      const lookupResponse = await api.get(`/api/time-logs/nfc/lookup/${cardId.toUpperCase()}`, config);
      
      if (lookupResponse.data?.success) {
        const responseData = lookupResponse.data.data;
        // Backend returns staff data at root level (_id, name, position, profilePicture, isClockedIn)
        // Get profile picture from local staff list as fallback
        const localStaff = staff.find(s => s.nfcCardId === cardId.toUpperCase());
        
        const statusData = {
          staff: {
            _id: responseData._id,
            name: responseData.name,
            position: responseData.position,
            profilePicture: localStaff?.profilePicture || responseData.profilePicture
          },
          isClockedIn: responseData.isClockedIn,
          lastLog: responseData.lastLog
        };
        setNfcTestStaffStatus(statusData);
        setShowNfcTestModal(true);
      }
    } catch (error) {
      console.error('Error looking up NFC card:', error);
      if (error.response?.status === 404) {
        toast.error('NFC card not registered. Please register the card to a staff member first.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to look up NFC card status');
      }
    }
  };

  // NFC Real Mode - Handle card tap (from keyboard wedge or external trigger)
  // Either shows modal for confirmation OR performs instant clock based on tapAndGo setting
  const handleNfcCardTap = async (nfcCardId) => {
    if (!nfcCardId || nfcCardId.length < 4) {
      return;
    }

    setSelectedNfcCard(nfcCardId.toUpperCase());
    setLoading(true);
    
    try {
      // Look up the staff and their current status
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': token ? `Bearer ${token}` : ''
        }
      };

      // Look up staff by NFC card
      const lookupResponse = await api.get(`/api/time-logs/nfc/lookup/${nfcCardId.toUpperCase()}`, config);
      
      if (!lookupResponse.data?.success) {
        toast.error('NFC card not recognized');
        setLoading(false);
        return;
      }

      // Backend returns staff data at root level: { _id, name, position, profilePicture, isClockedIn, lastLog }
      const responseData = lookupResponse.data.data;
      const isClockedIn = responseData.isClockedIn;
      
      // Safety check - ensure we have the required data
      if (!responseData._id || !responseData.name) {
        toast.error('Invalid staff data received');
        setLoading(false);
        return;
      }

      // Get profile picture from local staff list as fallback
      const localStaff = staff.find(s => s.nfcCardId === nfcCardId.toUpperCase());
      
      // Construct staff member object
      const staffMember = {
        _id: responseData._id,
        name: responseData.name,
        position: responseData.position,
        profilePicture: localStaff?.profilePicture || responseData.profilePicture
      };
      
      const statusData = {
        staff: staffMember,
        isClockedIn: isClockedIn,
        lastLog: responseData.lastLog
      };

      // Check if Tap and Go mode is enabled
      if (nfcTapAndGo) {
        // INSTANT MODE: Perform clock action immediately without confirmation
        const action = isClockedIn ? 'out' : 'in';
        const endpoint = action === 'in' 
          ? '/api/time-logs/nfc/clock-in' 
          : '/api/time-logs/nfc/clock-out';

        const { data } = await api.post(endpoint, { 
          nfcCardId: nfcCardId.toUpperCase() 
        }, config);
        
        if (!data.success) {
          throw new Error(data.message || `Failed to clock ${action}`);
        }

        // Show success toast
        toast.success(data.message || `${staffMember.name} clocked ${action} successfully`, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });

        // Store last action result for display
        setLastNfcAction({
          staffName: data.data?.staffName || staffMember.name,
          type: action,
          timestamp: new Date().toISOString(),
          totalHours: data.data?.totalHours,
          profilePicture: staffMember.profilePicture
        });

        // Select the staff member to show their details
        if (localStaff) {
          setSelectedStaff(localStaff);
          fetchLastTimeLog(localStaff._id);
          fetchRecentActivities(localStaff._id);
        }
        
        setSelectedNfcCard('');
        updateCurrentTime();
      } else {
        // CONFIRM MODE: Show the modal with staff info and clock action button
        setNfcTestStaffStatus(statusData);
        setShowNfcTestModal(true);
      }
    } catch (error) {
      console.error('NFC card tap error:', error);
      if (error.response?.status === 404) {
        toast.error('NFC card not registered. Please register the card to a staff member first.');
      } else {
        toast.error(error.response?.data?.message || error.message || 'NFC card not recognized');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.error('Invalid date string received:', dateString);
        return new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric', 
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Date formatting error:', error, 'for date string:', dateString);
      return 'Invalid Date';
    }
  };

  // Filter staff based on search query
  const filteredStaff = searchQuery
    ? staff.filter(person => 
        person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.position.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : staff;

  const isActiveSession = lastLog && lastLog.type === 'clockIn';

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    },
    exit: { opacity: 0 }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20
      }
    }
  };

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
      <motion.div 
        className="flex-1 transition-all duration-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          marginLeft: getMainContentMargin(),
          paddingTop: windowWidth < 768 ? '4rem' : '0'
        }}
      >
        <div className="p-6 md:p-8 pt-24 md:pt-8">
          {/* Header with title and toggle button */}
          <div className="flex items-center justify-between mb-6">
            <motion.h1 
              className="text-3xl font-bold" 
              style={{ color: colors.primary }}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              <FiClock className="inline mr-2" />
              Time Clock System
            </motion.h1>

            {/* Staff Panel Toggle Button - Only show in PIN mode or NFC Test mode */}
            {(attendanceMode === 'PIN' || (attendanceMode === 'NFC' && nfcTestMode)) && (
              <motion.button
                onClick={() => setShowStaffPanel(!showStaffPanel)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all"
                style={{ 
                  backgroundColor: showStaffPanel ? colors.primary : colors.primary + '10',
                  color: showStaffPanel ? colors.background : colors.primary,
                  border: `1px solid ${colors.primary}`
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <FiUsers className="text-lg" />
                <span className="hidden sm:inline">Staff Members</span>
                {showStaffPanel ? <FiChevronLeft /> : <FiChevronRight />}
              </motion.button>
            )}
          </div>

          {/* Attendance Mode Indicator */}
          {!loadingSettings && (
            <motion.div 
              className="mb-6 flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div 
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{ 
                  backgroundColor: attendanceMode === 'NFC' ? colors.accent + '20' : colors.primary + '10',
                  border: `1px solid ${attendanceMode === 'NFC' ? colors.accent : colors.muted}`
                }}
              >
                {attendanceMode === 'NFC' ? (
                  <FiCreditCard className="text-lg" style={{ color: colors.accent }} />
                ) : (
                  <FiUser className="text-lg" style={{ color: colors.primary }} />
                )}
                <span className="font-medium" style={{ color: colors.primary }}>
                  {attendanceMode === 'NFC' ? 'NFC Card Mode' : 'PIN Mode'}
                </span>
              </div>

              {/* NFC Test Mode - Dropdown Selection */}
              {attendanceMode === 'NFC' && nfcTestMode && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm px-2 py-1 bg-amber-100 text-amber-800 rounded font-medium">
                    Test Mode
                  </span>
                  
                  {/* NFC Card Dropdown - Opens modal on selection */}
                  <select
                    value={selectedNfcCard}
                    onChange={(e) => handleNfcCardSelect(e.target.value)}
                    className="px-3 py-2 rounded-lg border text-sm min-w-[250px]"
                    style={{ borderColor: colors.muted, color: colors.primary }}
                  >
                    <option value="">Simulate NFC Card Tap...</option>
                    {staffWithNfc.map((s) => (
                      <option key={s._id} value={s.nfcCardId}>
                        {s.name} - {s.nfcCardId}
                      </option>
                    ))}
                  </select>
                  
                  {staffWithNfc.length === 0 && (
                    <span className="text-xs text-amber-600">
                      No staff have NFC cards registered
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* NFC Test Mode Modal - Shows detected status and appropriate button */}
          <AnimatePresence>
            {showNfcTestModal && nfcTestStaffStatus && (
              <motion.div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowNfcTestModal(false);
                  setNfcTestStaffStatus(null);
                  setSelectedNfcCard('');
                }}
              >
                <motion.div
                  className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Staff Info */}
                  <div className="flex items-center gap-4 mb-6">
                    <StaffAvatar 
                      imagePath={nfcTestStaffStatus.staff?.profilePicture}
                      alt={nfcTestStaffStatus.staff?.name}
                      size={64}
                      className="border-2 rounded-full"
                    />
                    <div>
                      <h3 className="text-xl font-bold" style={{ color: colors.primary }}>
                        {nfcTestStaffStatus.staff?.name}
                      </h3>
                      <p className="text-sm" style={{ color: colors.muted }}>
                        {nfcTestStaffStatus.staff?.position}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${nfcTestStaffStatus.isClockedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        <span className="text-xs font-medium" style={{ color: nfcTestStaffStatus.isClockedIn ? colors.accent : colors.muted }}>
                          {nfcTestStaffStatus.isClockedIn ? 'Currently Clocked In' : 'Not Clocked In'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* NFC Card Info */}
                  <div 
                    className="p-3 rounded-lg mb-6 flex items-center gap-3"
                    style={{ backgroundColor: colors.accent + '15' }}
                  >
                    <FiCreditCard className="text-xl" style={{ color: colors.accent }} />
                    <div className="flex-1">
                      <p className="text-xs" style={{ color: colors.muted }}>NFC Card ID</p>
                      <p className="font-mono font-bold" style={{ color: colors.primary }}>{selectedNfcCard}</p>
                    </div>
                    {!nfcTestMode && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                        Live Mode
                      </span>
                    )}
                  </div>

                  {/* Action Button - Based on current status */}
                  <motion.button
                    onClick={() => handleNfcTestAction(nfcTestStaffStatus.isClockedIn ? 'out' : 'in')}
                    className="w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3"
                    style={{ 
                      backgroundColor: nfcTestStaffStatus.isClockedIn ? colors.secondary : colors.accent, 
                      color: colors.background 
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={loading}
                  >
                    {loading ? (
                      <span>Processing...</span>
                    ) : (
                      <>
                        <FiCreditCard className="text-xl" />
                        {nfcTestStaffStatus.isClockedIn ? 'Clock Out' : 'Clock In'}
                      </>
                    )}
                  </motion.button>

                  {/* Cancel Button */}
                  <button
                    onClick={() => {
                      setShowNfcTestModal(false);
                      setNfcTestStaffStatus(null);
                      setSelectedNfcCard('');
                    }}
                    className="w-full mt-3 py-2 rounded-lg font-medium border"
                    style={{ borderColor: colors.muted, color: colors.primary }}
                  >
                    Cancel
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* NFC Tap Again Modal - For clock in/out after staff is selected */}
          <AnimatePresence>
            {showNfcTapAgainModal && selectedStaff && (
              <motion.div
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNfcTapAgainModal(false)}
              >
                <motion.div
                  className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl text-center"
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Animated NFC Icon */}
                  <motion.div
                    className="mx-auto mb-6 w-24 h-24 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: clockAction === 'in' ? colors.accent + '20' : colors.secondary + '20' }}
                    animate={{ 
                      boxShadow: [
                        `0 0 0 0px ${clockAction === 'in' ? colors.accent : colors.secondary}40`,
                        `0 0 0 15px ${clockAction === 'in' ? colors.accent : colors.secondary}00`,
                      ]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 1.5,
                      ease: "easeOut"
                    }}
                  >
                    <FiCreditCard 
                      className="text-4xl" 
                      style={{ color: clockAction === 'in' ? colors.accent : colors.secondary }} 
                    />
                  </motion.div>

                  <h3 className="text-xl font-bold mb-2" style={{ color: colors.primary }}>
                    Tap Your NFC Card
                  </h3>
                  <p className="mb-6" style={{ color: colors.muted }}>
                    Tap your NFC card again to confirm {clockAction === 'in' ? 'Clock In' : 'Clock Out'}
                  </p>

                  {/* In test mode, show simulate button */}
                  {nfcTestMode && selectedStaff.nfcCardId && (
                    <motion.button
                      onClick={() => {
                        handleNfcTestAction(clockAction, selectedStaff.nfcCardId);
                      }}
                      className="w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 mb-3"
                      style={{ 
                        backgroundColor: clockAction === 'in' ? colors.accent : colors.secondary, 
                        color: colors.background 
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={loading}
                    >
                      {loading ? (
                        <span>Processing...</span>
                      ) : (
                        <>
                          <FiCreditCard />
                          Simulate Card Tap
                        </>
                      )}
                    </motion.button>
                  )}

                  {/* Show message if staff has no NFC card */}
                  {nfcTestMode && !selectedStaff.nfcCardId && (
                    <div 
                      className="p-3 rounded-lg mb-3 text-sm"
                      style={{ backgroundColor: colors.secondary + '20', color: colors.secondary }}
                    >
                      This staff member has no NFC card registered
                    </div>
                  )}

                  <button
                    onClick={() => setShowNfcTapAgainModal(false)}
                    className="w-full py-2 rounded-lg font-medium border"
                    style={{ borderColor: colors.muted, color: colors.primary }}
                  >
                    Cancel
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* NFC Live Mode - Awaiting Card Interface (uses same modal as Test Mode) */}
          {attendanceMode === 'NFC' && !nfcTestMode && (
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* NFC Awaiting Card Panel */}
              <div 
                className="rounded-xl p-8 text-center"
                style={{ 
                  backgroundColor: colors.accent + '10',
                  border: `2px solid ${colors.accent}40`
                }}
              >
                {/* Animated NFC Icon */}
                <motion.div
                  className="mx-auto mb-6 relative"
                  animate={{ 
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 2,
                    ease: "easeInOut"
                  }}
                >
                  <div 
                    className="w-32 h-32 rounded-full flex items-center justify-center mx-auto"
                    style={{ backgroundColor: colors.accent + '20' }}
                  >
                    <motion.div
                      className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: colors.accent + '40' }}
                      animate={{ 
                        boxShadow: [
                          `0 0 0 0px ${colors.accent}40`,
                          `0 0 0 15px ${colors.accent}00`,
                        ]
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.5,
                        ease: "easeOut"
                      }}
                    >
                      <FiWifi 
                        className="text-5xl transform rotate-45" 
                        style={{ color: colors.accent }} 
                      />
                    </motion.div>
                  </div>
                </motion.div>

                <h2 
                  className="text-2xl font-bold mb-2"
                  style={{ color: colors.primary }}
                >
                  Awaiting Card Tap
                </h2>
                <p 
                  className="text-base mb-4"
                  style={{ color: colors.muted }}
                >
                  Hold your NFC card near the reader to clock in or out
                </p>

                {/* Status indicator */}
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium" style={{ color: colors.muted }}>
                    NFC Reader Active
                  </span>
                </div>

                {/* Last Action Display */}
                <AnimatePresence>
                  {lastNfcAction && (
                    <motion.div
                      className="mt-6 p-4 rounded-lg max-w-md mx-auto"
                      style={{ 
                        backgroundColor: lastNfcAction.type === 'in' ? colors.accent + '20' : colors.secondary + '20',
                        border: `1px solid ${lastNfcAction.type === 'in' ? colors.accent : colors.secondary}`
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <div className="flex items-center gap-3">
                        {lastNfcAction.profilePicture && (
                          <StaffAvatar 
                            imagePath={lastNfcAction.profilePicture}
                            alt={lastNfcAction.staffName}
                            size={48}
                            className="border-2 rounded-full"
                          />
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-bold" style={{ color: colors.primary }}>
                            {lastNfcAction.staffName}
                          </p>
                          <p 
                            className="text-sm font-medium"
                            style={{ color: lastNfcAction.type === 'in' ? colors.accent : colors.secondary }}
                          >
                            Clocked {lastNfcAction.type === 'in' ? 'In' : 'Out'}
                            {lastNfcAction.totalHours > 0 && ` (${lastNfcAction.totalHours.toFixed(2)} hrs)`}
                          </p>
                        </div>
                        <motion.div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: lastNfcAction.type === 'in' ? colors.accent : colors.secondary }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <FiCheck className="text-white" />
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* When camera is active, hide grid and show camera in full width */}
          {/* Only show when in PIN mode or NFC Test mode */}
          {(attendanceMode === 'PIN' || (attendanceMode === 'NFC' && nfcTestMode)) && (
          <AnimatePresence mode="wait">
            {selectedStaff && showPinEntry && showCamera ? (
              <motion.div 
                key="camera-view"
                className="max-w-2xl mx-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="rounded-lg shadow-sm p-6" style={{ border: `1px solid ${colors.muted}` }}>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <button
                        onClick={handleBackToPin}
                        className="text-sm flex items-center mr-4"
                        style={{ color: colors.primary }}
                      >
                        <FiArrowLeft className="mr-1" /> Back
                      </button>
                      <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
                        Take Photo for Clock {clockAction === 'in' ? 'In' : 'Out'}
                      </h3>
                    </div>
                    
                    {!capturedImage ? (
                      <>
                        <div 
                          className="relative overflow-hidden rounded border"
                          style={{ 
                            height: '400px', // Made taller for better aspect ratio
                            borderColor: colors.muted
                          }}
                        >
                          <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            width="100%"
                            height="100%"
                            videoConstraints={{ 
                              facingMode: "user",
                              aspectRatio: 1 // Enforce 1:1 aspect ratio
                            }}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                        <button
                          onClick={capturePhoto}
                          className="w-full py-3 rounded-lg font-medium transition-opacity hover:opacity-90"
                          style={{ backgroundColor: colors.accent, color: colors.background }}
                        >
                          <FiCamera className="inline mr-2" />
                          Capture Photo
                        </button>
                      </>
                    ) : (
                      <>
                        <div 
                          className="relative overflow-hidden rounded border"
                          style={{ 
                            height: '400px', // Made taller for better aspect ratio
                            borderColor: colors.muted
                          }}
                        >
                          <img
                            src={capturedImage}
                            alt="Captured"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setCapturedImage(null)}
                            className="flex-1 py-2 border rounded"
                            style={{ borderColor: colors.muted, color: colors.primary }}
                          >
                            <FiX className="inline mr-2" />
                            Retake
                          </button>
                          <button
                            onClick={handleTimeLog}
                            className="flex-1 py-2 rounded font-medium"
                            style={{ backgroundColor: colors.primary, color: colors.background }}
                          >
                            <FiCheck className="inline mr-2" />
                            Confirm & {clockAction === 'in' ? 'Clock In' : 'Clock Out'}
                          </button>
                        </div>
                      </>
                    )}
                    
                    <button
                      onClick={handleCancelClock}
                      className="w-full py-2 border rounded mt-3"
                      style={{ borderColor: colors.muted, color: colors.primary }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="main-view"
                className={`grid gap-6 ${showStaffPanel ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5' : 'grid-cols-1 lg:grid-cols-10 max-w-6xl mx-auto'}`}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Staff List - only show when toggle is active */}
                <AnimatePresence>
                  {showStaffPanel && (
                    <motion.div 
                      className="md:col-span-1 lg:col-span-2"
                      variants={itemVariants}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <div className="rounded-lg p-4 shadow-sm" style={{ backgroundColor: colors.primary }}>
                        <h2 className="text-xl font-semibold mb-4" style={{ color: colors.background }}>
                          <FiUser className="inline mr-2" />
                          Staff Members
                        </h2>

                    {/* Search Box - Updated with white text */}
                    <div className="relative mb-4">
                      <input
                        type="text"
                        placeholder="Search staff..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-2 pl-9 rounded border"
                        style={{ 
                          borderColor: colors.background,
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          color: colors.background,
                          caretColor: colors.background
                        }}
                      />
                      <FiSearch className="absolute left-3 top-3" style={{ color: colors.background }} />
                    </div>

                    {/* Staff List with animations */}
                    <div className="space-y-2 max-h-[60vh] md:max-h-[70vh] overflow-y-auto pr-2">
                      <AnimatePresence>
                        {loading ? (
                          <motion.div 
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-6"
                          >
                            <BrandedLoadingScreen message="Loading staff..." />
                          </motion.div>
                        ) : filteredStaff.length === 0 ? (
                          <motion.div 
                            key="no-staff"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="text-center py-6" 
                            style={{ color: colors.background }}
                          >
                            No staff members found
                          </motion.div>
                        ) : (
                          filteredStaff.map((person, index) => (
                            <motion.div
                              key={person._id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ 
                                delay: index * 0.05,
                                type: 'spring',
                                stiffness: 300,
                                damping: 25
                              }}
                              onClick={() => {
                                setSelectedStaff(person);
                                // Reset any active clock actions when selecting a new staff member
                                handleCancelClock();
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`p-3 rounded cursor-pointer transition-colors ${
                                selectedStaff?._id === person._id
                                  ? 'ring-2 ring-opacity-50'
                                  : 'hover:ring-2 hover:ring-opacity-30'
                              }`}
                              style={{
                                backgroundColor: colors.background,
                                color: colors.primary,
                                ringColor: colors.accent
                              }}
                            >                              <div className="flex items-center gap-3">
                                <StaffAvatar 
                                  imagePath={person.profilePicture}
                                  alt={`${person.name}'s photo`}
                                  size={40}
                                  className="border rounded-full"
                                />
                                <div>
                                  <p className="font-medium">{person.name}</p>
                                  <p className="text-sm" style={{ color: colors.muted }}>
                                    {person.position}
                                  </p>
                                </div>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
                  )}
                </AnimatePresence>

                {/* Time Clock Interface - 70% width when staff panel is hidden */}
                <motion.div 
                  className={showStaffPanel ? "md:col-span-2 lg:col-span-3" : "lg:col-span-7"}
                  variants={itemVariants}
                >
                  <div 
                    className="rounded-lg shadow-sm p-6 h-full"
                    style={{ border: `1px solid ${colors.muted}` }}
                  >
                    {/* Header */}
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>
                        <FiClock className="inline-block mr-2" />
                        Time Clock
                      </h2>
                    </div>

                    {/* Staff Info & Time Log Interface */}
                    <AnimatePresence mode="wait">
                      {!selectedStaff ? (
                        <motion.div 
                          key="no-selection"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-center py-16"
                        >
                          <FiUser size={64} className="mx-auto mb-4 opacity-30" />
                          <p className="text-xl mb-2" style={{ color: colors.muted }}>
                            Select a staff member to view time clock
                          </p>
                          {!showStaffPanel && (
                            <motion.button
                              onClick={() => setShowStaffPanel(true)}
                              className="mt-4 px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
                              style={{ backgroundColor: colors.accent, color: colors.background }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <FiUsers />
                              Show Staff Members
                            </motion.button>
                          )}
                        </motion.div>
                      ) : showPinEntry && !showCamera ? (
                        <motion.div 
                          key="pin-entry"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="space-y-4"
                        >
                          <h3 className="text-lg font-semibold text-center" style={{ color: colors.primary }}>
                            Enter PIN to {clockAction === 'in' ? 'Clock In' : 'Clock Out'}
                          </h3>
                          
                          <p className="text-sm text-center" style={{ color: colors.muted }}>
                            Please enter your security PIN for verification
                          </p>
                          
                          <div className="flex justify-center my-4">
                            <motion.input
                              type="password"
                              className="w-full max-w-xs p-3 text-center text-2xl tracking-widest border rounded"
                              value={pinInput}
                              onChange={(e) => {
                                // Only allow digits and limit to 6 characters
                                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                setPinInput(value);
                              }}
                              placeholder="• • • •"
                              maxLength={6}
                              autoFocus
                              style={{ borderColor: colors.muted }}
                              animate={{ 
                                boxShadow: pinInput.length >= 4 
                                  ? `0 0 0 2px ${colors.accent}30` 
                                  : "none" 
                              }}
                            />
                          </div>
                          
                          <div className="flex gap-3">
                            <motion.button
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                              onClick={handleCancelClock}
                              className="flex-1 py-2 border rounded"
                              style={{ borderColor: colors.muted, color: colors.primary }}
                            >
                              Cancel
                            </motion.button>
                            <motion.button
                              variants={buttonVariants}
                              whileHover="hover"
                              whileTap="tap"
                              onClick={handlePinVerify}
                              className="flex-1 py-2 rounded font-medium"
                              disabled={!pinInput || pinInput.length < 4}
                              style={{ 
                                backgroundColor: colors.primary, 
                                color: colors.background,
                                opacity: !pinInput || pinInput.length < 4 ? 0.5 : 1
                              }}
                            >
                              Continue
                            </motion.button>
                          </div>
                        </motion.div>
                      ) : !showPinEntry ? (
                        <motion.div
                          key="staff-interface"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {/* Staff Info */}
                          <motion.div 
                            className="mb-6"
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                          >
                            <p className="text-lg font-medium" style={{ color: colors.primary }}>
                              {selectedStaff.name}
                            </p>
                            <p className="text-sm" style={{ color: colors.muted }}>
                              {selectedStaff.position}
                            </p>
                          </motion.div>

                          <div className="space-y-4">
                            {/* Current Time Display */}
                            <motion.div 
                              className="p-4 rounded text-center"
                              style={{ backgroundColor: colors.primary + '10' }}
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.1 }}
                            >
                              <p className="text-sm font-medium mb-1" style={{ color: colors.muted }}>
                                Current Time
                              </p>
                              <p className="text-2xl font-bold" style={{ color: colors.primary }}>
                                {currentTime}
                              </p>
                            </motion.div>
                            
                            {/* Status */}
                            <motion.div 
                              className="p-4 rounded flex flex-col items-center justify-center gap-2"
                              style={{ 
                                backgroundColor: isActiveSession ? 
                                  colors.accent + '20' : colors.secondary + '10' 
                              }}
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.2 }}
                            >
                              <div className="flex items-center justify-center gap-2">
                                {isActiveSession ? (
                                  <>
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                    <p className="text-sm font-medium" style={{ color: colors.accent }}>
                                      Currently clocked in
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                                    <p className="text-sm font-medium" style={{ color: colors.secondary }}>
                                      {lastLog ? 'Clocked out' : 'Not clocked in today'}
                                    </p>
                                  </>
                                )}
                              </div>
                              
                              {/* Display clock-in time if active session */}
                              {isActiveSession && lastLog && (
                                <div className="w-full text-center mt-2 pt-2 border-t" style={{ borderColor: colors.accent + '50' }}>
                                  <p className="text-xs" style={{ color: colors.muted }}>
                                    Clocked in at:
                                  </p>
                                  <p className="text-sm font-medium" style={{ color: colors.accent }}>
                                    {lastLog.formattedTimestamp || formatDateTime(lastLog.timestamp || lastLog.createdAt)}
                                  </p>
                                </div>
                              )}
                            </motion.div>

                            {/* Action Buttons */}
                            <motion.div 
                              className="grid grid-cols-2 gap-4"
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ delay: 0.3 }}
                            >
                              <motion.button
                                onClick={() => handleClockButtonClick('in')}
                                disabled={loading || isActiveSession}
                                className="py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: colors.accent, color: colors.background }}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                              >
                                Clock In
                              </motion.button>
                              <motion.button
                                onClick={() => handleClockButtonClick('out')}
                                disabled={loading || !isActiveSession}
                                className="py-3 px-6 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                                style={{ backgroundColor: colors.secondary, color: colors.background }}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                              >
                                Clock Out
                              </motion.button>
                            </motion.div>
                            
                            {/* Recent Activity with animation */}
                            <motion.div 
                              className="mt-4 pt-4 border-t" 
                              style={{ borderColor: colors.muted }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.4 }}
                            >
                              <h3 className="text-base font-medium mb-3 flex items-center gap-1" style={{ color: colors.primary }}>
                                <FiClock size={16} />
                                Recent Activity
                              </h3>
                              
                              <AnimatePresence>
                                {lastLog ? (
                                  <motion.div 
                                    className="p-3 rounded"
                                    style={{ backgroundColor: colors.muted + '10' }}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    layout
                                  >
                                    <div className="flex gap-3">
                                      {/* Left side - Verification photo with animation */}
                                      {lastLog.photo && (
                                        <motion.div 
                                          className="flex-shrink-0"
                                          initial={{ scale: 0.8, opacity: 0 }}
                                          animate={{ scale: 1, opacity: 1 }}
                                          transition={{ delay: 0.2 }}
                                        >
                                          <motion.img 
                                            src={`${API_URL}/public/${lastLog.photo}`}
                                            alt="" 
                                            className="h-16 w-16 object-cover rounded"
                                            onError={(e) => {
                                              e.target.src = 'https://via.placeholder.com/80x80?text=No+Image';
                                            }}
                                            whileHover={{ scale: 1.1 }}
                                          />
                                        </motion.div>
                                      )}
                                      
                                      {/* Right side - All information */}
                                      <div className="flex-grow">
                                        {/* Action type and timestamp */}
                                        <div className="flex justify-between items-center mb-2">
                                          <div className="flex items-center">
                                            <div className={`w-2 h-2 rounded-full mr-2 ${lastLog.type === 'clockIn' ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`}></div>
                                            <span className="font-medium" style={{ color: lastLog.type === 'clockIn' ? colors.accent : colors.secondary }}>
                                              {lastLog.type === 'clockIn' ? 'Clock In' : 'Clock Out'}
                                            </span>
                                          </div>
                                          <span className="text-xs px-2 py-1 rounded-full" style={{ 
                                            backgroundColor: colors.primary + '10',
                                            color: colors.primary 
                                          }}>
                                            {new Date(lastLog.timestamp || lastLog.createdAt).toLocaleDateString('en-US', {
                                              month: 'short',
                                              day: 'numeric',
                                              hour: 'numeric',
                                              minute: '2-digit',
                                              hour12: true
                                            })}
                                          </span>
                                        </div>
                                        
                                        {/* Duration and status on same line */}
                                        <div className="flex justify-between text-xs">
                                          <span style={{ color: colors.muted }}>
                                            {lastLog.type === 'clockIn' ? 'Currently working' : 'Shift completed'}
                                          </span>
                                          {lastLog.type === 'clockOut' && lastLog.totalHours !== undefined && lastLog.totalHours > 0 && (
                                            <span className="font-medium" style={{ color: colors.secondary }}>
                                              Duration: {typeof lastLog.totalHours === 'number' ? 
                                                `${Math.floor(lastLog.totalHours)}h ${Math.round((lastLog.totalHours % 1) * 60)}m` : 
                                                lastLog.totalHours}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ) : (
                                  <motion.div 
                                    className="p-3 text-center rounded" 
                                    style={{ backgroundColor: colors.muted + '10' }}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                  >
                                    <p className="text-xs" style={{ color: colors.muted }}>
                                      No time logs recorded today
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Recent Activities Panel - 30% width, always show when staff panel is hidden */}
                {!showStaffPanel && (
                  <motion.div 
                    className="lg:col-span-3"
                    variants={itemVariants}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div 
                      className="rounded-lg shadow-sm p-4 h-full"
                      style={{ border: `1px solid ${colors.muted}` }}
                    >
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: colors.primary }}>
                        <FiClock />
                        Recent Activities
                      </h3>
                      
                      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {recentActivities.length > 0 ? (
                          recentActivities.map((activity, index) => (
                            <motion.div
                              key={activity._id || index}
                              className="p-3 rounded-lg"
                              style={{ backgroundColor: colors.muted + '15' }}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${activity.type === 'clockIn' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                  <span 
                                    className="font-medium text-sm"
                                    style={{ color: activity.type === 'clockIn' ? colors.accent : colors.secondary }}
                                  >
                                    {activity.type === 'clockIn' ? 'Clock In' : 'Clock Out'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs" style={{ color: colors.muted }}>
                                {new Date(activity.timestamp || activity.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </p>
                              {activity.totalHours !== undefined && activity.type === 'clockOut' && activity.totalHours > 0 && (
                                <p className="text-xs font-medium mt-1" style={{ color: colors.secondary }}>
                                  Duration: {typeof activity.totalHours === 'number' ? 
                                    `${Math.floor(activity.totalHours)}h ${Math.round((activity.totalHours % 1) * 60)}m` : 
                                    activity.totalHours}
                                </p>
                              )}
                            </motion.div>
                          ))
                        ) : (
                          <div 
                            className="p-4 rounded-lg text-center"
                            style={{ backgroundColor: colors.muted + '10' }}
                          >
                            <FiClock size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm" style={{ color: colors.muted }}>
                              {selectedStaff ? 'No recent activities' : 'Select a staff member'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default TimeClock;