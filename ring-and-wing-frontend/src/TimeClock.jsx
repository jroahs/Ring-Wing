import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiUser, FiClock, FiSearch, FiCamera, FiCheck, FiX, FiArrowLeft } from 'react-icons/fi';
import Sidebar from './Sidebar';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Webcam from 'react-webcam';
import { API_URL } from './App';
import { motion, AnimatePresence } from 'framer-motion';
import StaffAvatar from './components/StaffAvatar';

const TimeClock = () => {
  // Colors for consistent styling
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

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 768) setIsSidebarOpen(true);
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
        const response = await axios.get('/api/staff/time-clock');
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
    } else {
      setLastLog(null);
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

      const { data } = await axios.get(`/api/time-logs/staff/${staffId}?${params}`, config);
      
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
    
    setClockAction(type);
    setShowPinEntry(true);
    setPinInput('');
    setShowCamera(false);
    setCapturedImage(null);
  };

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
      const { data } = await axios.post(
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
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        colors={colors} 
      />
      
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
          <motion.h1 
            className="text-3xl font-bold mb-6" 
            style={{ color: colors.primary }}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
          >
            <FiClock className="inline mr-2" />
            Time Clock System
          </motion.h1>

          {/* When camera is active, hide grid and show camera in full width */}
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
                className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Staff List - hidden when camera is active */}
                <motion.div 
                  className="md:col-span-1 lg:col-span-2"
                  variants={itemVariants}
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
                            className="text-center py-6" 
                            style={{ color: colors.background }}
                          >
                            Loading staff...
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

                {/* Time Clock Interface - only show PIN entry here */}
                <motion.div 
                  className="md:col-span-2 lg:col-span-3"
                  variants={itemVariants}
                >
                  <div 
                    className="rounded-lg shadow-sm p-6"
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
                          className="text-center py-8"
                        >
                          <FiUser size={48} className="mx-auto mb-2 opacity-30" />
                          <p className="text-lg" style={{ color: colors.muted }}>
                            Select a staff member to view time clock
                          </p>
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
                                          {lastLog.totalHours !== undefined && (
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default TimeClock;