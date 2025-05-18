import { useState, useEffect } from 'react';
import { FiUser, FiPlus, FiEdit, FiTrash, FiSave, FiCamera, FiChevronDown } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Sidebar from './Sidebar';
import WorkIDModal from './WorkIDModal';
import { toast } from 'react-toastify';
import { Button } from './components/ui/Button'; // Import Button component
import StaffAvatar from './components/StaffAvatar'; // Import StaffAvatar component

const StaffManagement = () => {
  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showGovtDetails, setShowGovtDetails] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const statusOptions = ['Active', 'On Leave', 'Inactive'];
  const positionOptions = ['Barista', 'Cashier', 'Chef', 'Manager', 'Server', 'Cook'];

  const [formData, setFormData] = useState({
    // Staff details
    name: '',
    position: '',
    profilePicture: '',
    phone: '',
    dailyRate: '',
    status: 'Active',
    sssNumber: '',
    tinNumber: '',
    philHealthNumber: '',
    pinCode: '0000', // Default PIN
    
    // User account details
    username: '',
    email: '',
    password: '',
  });
  
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setIsLoading(true);
        // Set a timeout to handle potential API connection issues
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out')), 10000)
        );
        
        // Add authorization token to the request
        const token = localStorage.getItem('authToken');
        console.log('Using auth token:', token ? 'Found token' : 'No token');
        
        const config = {
          headers: { 
            'Authorization': token ? `Bearer ${token}` : ''
          },
          withCredentials: true
        };
        
        const fetchPromise = axios.get('/api/staff', config);
        
        // Race between fetch and timeout
        const response = await Promise.race([fetchPromise, timeoutPromise]);
        
        // Process the data to ensure all required fields exist
        let staffData = Array.isArray(response.data) ? response.data : [];
        
        console.log('Raw staff data:', staffData);
        
        // Normalize staff data to ensure all required fields exist
        const normalizedStaff = staffData.map(member => {
          // Extract the user data from the nested userId object
          const userData = member.userId || {};
          
          return {
            _id: member._id || `temp-${Date.now()}-${Math.random()}`,
            name: member.name || '',
            position: member.position || '',
            // Extract email and username either from the root level or from userId
            email: member.email || userData.email || '',
            username: member.username || userData.username || '',
            // Keep the userId reference for future use
            userId: member.userId || null,
            // Other staff fields
            phone: member.phone || '',
            dailyRate: member.dailyRate || 0,
            status: member.status || 'Active',
            password: '', // Password is never returned from server
            pinCode: member.pinCode ? String(member.pinCode) : '0000',
            profilePicture: member.profilePicture || '',
            sssNumber: member.sssNumber || '',
            tinNumber: member.tinNumber || '',
            philHealthNumber: member.philHealthNumber || ''
          };
        });
        
        console.log('Normalized staff data:', normalizedStaff);
        
        // Ensure each staff member has a unique ID
        setStaff(normalizedStaff);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch staff data');
        // Set empty array to prevent undefined errors
        setStaff([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 768) setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (2MB limit)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image too large. Maximum size is 2MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        // Store the base64 data directly
        setFormData(prev => ({ ...prev, profilePicture: reader.result }));
        console.log('Image uploaded successfully as base64');
      };
      reader.onerror = () => {
        toast.error('Failed to read the image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (['phone', 'sssNumber', 'tinNumber', 'philHealthNumber'].includes(name)) {
      const cleaned = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: cleaned }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper function to check if PIN is unique
  const isPinCodeUnique = (pinCode, currentStaffId = null) => {
    const existingPin = staff.find(s => 
      s.pinCode === pinCode && 
      // If we're editing a staff member, exclude their current PIN from the check
      (!currentStaffId || s._id !== currentStaffId)
    );
    return !existingPin;
  };  // Helper function to format image URLs
  const getImageUrl = (imagePath) => {
    if (!imagePath) {
      // Use local placeholder from public folder
      return '/placeholders/staff.png';
    }
    
    if (imagePath.startsWith('data:')) {
      // Base64 image
      return imagePath;
    }
    
    // Handle different path formats
    const baseUrl = 'http://localhost:5000';
    
    // Direct path to image in /uploads/staff
    if (imagePath.includes('/uploads/staff/')) {
      const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      return `${baseUrl}${cleanPath}`;
    } else {
      // Fallback to direct path for staff avatars
      const filename = imagePath.split('/').pop();
      return `${baseUrl}/uploads/staff/${filename}`;
    }
  };
  
  const validateForm = () => {
    const errors = {};

    // Username validation - required and trimmed
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.includes(' ')) {
      errors.username = 'Username cannot contain spaces';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Password validation - minimum 8 characters
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    // PIN validation - must be 4-6 digits and unique
    if (!formData.pinCode.trim()) {
      errors.pinCode = 'PIN code is required';
    } else if (!/^\d{4,6}$/.test(formData.pinCode)) {
      errors.pinCode = 'PIN must be 4-6 digits';
    } else if (!isPinCodeUnique(formData.pinCode, editMode ? selectedStaff?._id : null)) {
      errors.pinCode = 'PIN code already in use by another staff member';
    }

    // Other required fields
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.position) errors.position = 'Position is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!/^0\d{10}$/.test(formData.phone)) errors.phone = 'Invalid phone number format (e.g., 09123456789)';
    if (!formData.dailyRate) errors.dailyRate = 'Daily rate is required';
    
    // Show each validation error as a toast notification
    Object.values(errors).forEach(error => {
      toast.error(error);
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStaffInfo = () => {
    const errors = {};
    
    // PIN validation - must be 4-6 digits
    if (!formData.pinCode.trim()) {
      errors.pinCode = 'PIN code is required';
    } else if (!/^\d{4,6}$/.test(formData.pinCode)) {
      errors.pinCode = 'PIN must be 4-6 digits';
    } else if (!isPinCodeUnique(formData.pinCode, editMode ? selectedStaff?._id : null)) {
      errors.pinCode = 'PIN code already in use by another staff member';
    }

    // Other required staff fields
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.position) errors.position = 'Position is required';
    if (!formData.phone.trim()) errors.phone = 'Phone number is required';
    if (!/^0\d{10}$/.test(formData.phone)) errors.phone = 'Invalid phone number format (e.g., 09123456789)';
    if (!formData.dailyRate) errors.dailyRate = 'Daily rate is required';
    
    // Show each validation error as a toast notification
    Object.values(errors).forEach(error => {
      toast.error(error);
    });
    
    setFormErrors({...formErrors, ...errors});
    return Object.keys(errors).length === 0;
  };
  
  const validateAccountInfo = () => {
    const errors = {};

    // Username validation - required and trimmed
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.includes(' ')) {
      errors.username = 'Username cannot contain spaces';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }

    // Password validation - only required for new accounts
    if (!editMode && !formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.trim() && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    // Show each validation error as a toast notification
    Object.values(errors).forEach(error => {
      toast.error(error);
    });
    
    setFormErrors({...formErrors, ...errors});
    return Object.keys(errors).length === 0;
  };

  const handleAddStaff = async () => {
    if (!validateForm()) return;

    try {
      // Convert to lowercase before sending
      const payload = {
        ...formData,
        username: formData.username.toLowerCase(),
        email: formData.email.toLowerCase(),
      };

      // Add auth token to request headers
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        withCredentials: true
      };

      console.log('Sending staff creation request');
      const response = await axios.post('/api/staff', payload, config);
      setStaff([...staff, response.data]);
      resetForm();
      toast.success('Staff member added successfully');
    } catch (error) {
      console.error('Error adding staff:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to add staff member';
      toast.error(errorMsg);
    }
  };

  const handleEditStaff = (staffMember) => {
    setEditMode(true);
    setSelectedStaff(staffMember);
    
    // Extract username and email from userId if available
    const email = staffMember.userId?.email || staffMember.email || '';
    const username = staffMember.userId?.username || staffMember.username || '';
    
    console.log('Loading staff member:', {
      id: staffMember._id,
      name: staffMember.name,
      username: username,
      email: email,
      pinCode: staffMember.pinCode || '0000'
    });
    
    // Ensure PIN code is always a string and never undefined
    const pinCode = staffMember.pinCode ? String(staffMember.pinCode) : '0000';
    
    setFormData({
      ...staffMember,
      // Map user fields from the nested userId object
      username: username,
      email: email,
      password: '', // Empty password since we don't receive it from the server
      // Map other staff fields
      phone: staffMember.phone?.replace('+63', '0') || '',
      dailyRate: staffMember.dailyRate?.toString() || '',
      pinCode: pinCode,
      name: staffMember.name || '',
      position: staffMember.position || '',
      profilePicture: staffMember.profilePicture || '',
      status: staffMember.status || 'Active',
      sssNumber: staffMember.sssNumber || '',
      tinNumber: staffMember.tinNumber || '',
      philHealthNumber: staffMember.philHealthNumber || ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      if (!validateForm()) return;
      
      console.log('Saving staff with PIN code:', formData.pinCode);
      
      // Make sure pinCode is a valid string
      const pinCode = formData.pinCode ? String(formData.pinCode) : '0000';
      
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        name: formData.name,
        position: formData.position,
        profilePicture: formData.profilePicture,
        phone: formData.phone,
        dailyRate: formData.dailyRate,
        status: formData.status,
        sssNumber: formData.sssNumber || '',
        tinNumber: formData.tinNumber || '',
        philHealthNumber: formData.philHealthNumber || '',
        pinCode // Explicitly include PIN code as string
      };
      
      console.log('Sending payload with PIN code:', payload.pinCode);
      
      // Add auth token to request headers
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };
      
      const response = await axios.put(`/api/staff/${selectedStaff._id}`, payload, config);

      console.log('Server response after update:', response.data);
      
      // Make sure received data has the PIN code
      const updatedStaff = {
        ...response.data,
        pinCode: response.data.pinCode || pinCode // Preserve PIN if not returned
      };
      
      setStaff(staff.map((s) => (s._id === selectedStaff._id ? updatedStaff : s)));
      resetForm();
      setEditMode(false);
      toast.success('Staff member updated successfully');
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error(error.response?.data?.message || 'Failed to update staff member');
    }
  };

  // Function to handle saving only staff information
  const handleSaveStaffOnly = async () => {
    try {
      if (!validateStaffInfo()) return;
      
      // Make sure pinCode is a valid string
      const pinCode = formData.pinCode ? String(formData.pinCode) : '0000';
      
      const payload = {
        name: formData.name,
        position: formData.position,
        profilePicture: formData.profilePicture,
        phone: formData.phone,
        dailyRate: formData.dailyRate,
        status: formData.status,
        sssNumber: formData.sssNumber || '',
        tinNumber: formData.tinNumber || '',
        philHealthNumber: formData.philHealthNumber || '',
        pinCode,
        staffOnly: true // Flag to notify backend this is staff-only update
      };
      
      console.log('Sending staff-only update with payload:', payload);
      
      // Add auth token to request headers
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };
      
      const response = await axios.put(`/api/staff/${selectedStaff._id}`, payload, config);

      console.log('Server response after staff update:', response.data);
      
      // Make sure received data has the PIN code
      const updatedStaff = {
        ...selectedStaff,
        ...response.data,
        pinCode: response.data.pinCode || pinCode // Preserve PIN if not returned
      };
      
      setStaff(staff.map((s) => (s._id === selectedStaff._id ? updatedStaff : s)));
      resetForm();
      setEditMode(false);
      toast.success('Staff information updated successfully');
    } catch (error) {
      console.error('Error saving staff information:', error);
      toast.error(error.response?.data?.message || 'Failed to update staff information');
    }
  };
  
  // Function to handle saving only account information
  const handleSaveAccountOnly = async () => {
    try {
      if (!validateAccountInfo()) return;
      
      // Create account-only payload
      const payload = {
        username: formData.username.toLowerCase(),
        email: formData.email.toLowerCase(),
        password: formData.password,
        accountOnly: true // Flag to notify backend this is account-only update
      };
      
      console.log('Sending account-only update with payload:', payload);
      
      // Add auth token to request headers
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };
      
      const response = await axios.put(`/api/staff/${selectedStaff._id}`, payload, config);

      console.log('Server response after account update:', response.data);
      
      // Update the staff data in state with new account info
      const updatedStaff = {
        ...selectedStaff,
        username: response.data.username || payload.username,
        email: response.data.email || payload.email,
        // Don't include password in state
      };
      
      setStaff(staff.map((s) => (s._id === selectedStaff._id ? updatedStaff : s)));
      resetForm();
      setEditMode(false);
      toast.success('Account information updated successfully');
    } catch (error) {
      console.error('Error saving account information:', error);
      toast.error(error.response?.data?.message || 'Failed to update account information');
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      // Add auth token to request headers
      const token = localStorage.getItem('authToken');
      const config = {
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      };
      
      await axios.delete(`/api/staff/${id}`, config);
      setStaff(prev => prev.filter(s => s._id !== id));
      toast.success('Staff member deleted successfully');
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error(error.response?.data?.message || 'Failed to delete staff member');
    }
  };

  const resetForm = () => {
    setFormData({
      // Staff details
      name: '',
      position: '',
      profilePicture: '',
      phone: '',
      dailyRate: '',
      status: 'Active',
      sssNumber: '',
      tinNumber: '',
      philHealthNumber: '',
      pinCode: '0000', // Reset PIN to default
      
      // User account details
      username: '',
      email: '',
      password: '',
    });
    setEditMode(false);
    setShowGovtDetails(false);
    setShowAccountDetails(false);
    setFormErrors({});
  };

  // Animation variants - simplified to prevent performance issues
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.02 // Reduced stagger time
      }
    }
  };

  const itemVariants = {
    hidden: { y: 10, opacity: 0 }, // Reduced movement
    visible: {
      y: 0,
      opacity: 1,
      transition: { 
        type: "tween", // Changed from spring to tween for better performance
        duration: 0.2
      }
    }
  };

  const listItemVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { type: "tween", duration: 0.2 }
    },
    hover: { 
      scale: 1.01, // Reduced scale effect
      transition: { type: "tween", duration: 0.1 } 
    },
    tap: { scale: 0.99 }
  };
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} colors={colors} />
      
      <div 
        className="flex-1 transition-all duration-300" 
        style={{
          marginLeft: windowWidth < 768 ? '0' : windowWidth >= 1920 ? '8rem' : '5rem',
          paddingTop: windowWidth < 768 ? '4rem' : '0'
        }}
      >
        <div className="p-6 md:p-8">
          <h1 
            className="text-3xl font-bold mb-6" 
            style={{ color: colors.primary }}
          >
            <FiUser className="inline mr-2" />
            Staff Management
          </h1>

          {isLoading ? (
            <div 
              className="text-center" 
              style={{ color: colors.primary }}
            >
              <div className="mb-2">
                <FiUser size={24} />
              </div>
              <p>Loading staff members...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Staff List */}
              <div className="lg:col-span-1">
                <div className="rounded-lg p-4 shadow-sm" style={{ backgroundColor: colors.primary }}>
                  <h2 className="text-xl font-semibold mb-4" style={{ color: colors.background }}>
                    <FiUser className="inline mr-2" />
                    Staff Members
                  </h2>
                  
                  <div className="space-y-2">
                    {staff.length === 0 ? (
                      <div 
                        className="text-center py-4" 
                        style={{ color: colors.background }}
                      >
                        No staff members found. Add your first employee!
                      </div>
                    ) : (
                      <AnimatePresence>
                        {staff.map((staffMember) => (
                          <motion.div 
                            key={staffMember._id || `staff-${Math.random()}`} 
                            className="p-3 rounded flex justify-between items-center"
                            style={{ 
                              backgroundColor: colors.background, 
                              color: colors.primary, 
                              border: `1px solid ${colors.muted}` 
                            }}
                            variants={listItemVariants}
                            whileHover="hover"
                            whileTap="tap"
                            initial="hidden"
                            animate="visible"
                            exit={{ opacity: 0, x: -10 }}
                            layout
                          >                            <div className="flex items-center gap-3">
                              <StaffAvatar 
                                imagePath={staffMember.profilePicture}
                                alt={`${staffMember.name}'s photo`}
                                size={40}
                                className="border rounded-sm overflow-hidden"
                              />
                              <div>
                                <p className="font-medium">{staffMember.name}</p>
                                <p className="text-sm" style={{ color: colors.muted }}>{staffMember.position}</p>
                              </div>
                            </div>                            <div className="flex gap-2">
                              <Button 
                                onClick={() => { setSelectedStaff(staffMember); setIsModalOpen(true); }}
                                variant="ghost"
                                size="sm"
                              >
                                <FiUser />
                              </Button>
                              <Button 
                                onClick={() => handleEditStaff(staffMember)}
                                variant="ghost"
                                size="sm"
                              >
                                <FiEdit />
                              </Button>
                              <Button 
                                onClick={() => handleDeleteStaff(staffMember._id)}
                                variant="ghost"
                                size="sm"
                              >
                                <FiTrash />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              </div>

              {/* Add/Edit Form */}
              <div className="lg:col-span-2">
                <motion.div 
                  className="rounded-lg p-4 shadow-sm relative" 
                  style={{ border: `1px solid ${colors.muted}` }}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
                >
                  <div className="flex justify-between items-center mb-3">
                    <motion.h2 
                      className="text-xl font-semibold" 
                      style={{ color: colors.primary }}
                      layout
                    >
                      <FiPlus className="inline mr-2" />
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={editMode ? 'edit' : 'add'}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          {editMode ? 'Edit Staff Member' : 'Add New Staff'}
                        </motion.span>
                      </AnimatePresence>
                    </motion.h2>
                      {/* Government Details dropdown toggle */}
                    <div className="relative z-20">
                      <Button 
                        onClick={() => setShowGovtDetails(!showGovtDetails)}
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-1 text-xs"
                      >
                        <span className="font-medium">Government Details</span>
                        <FiChevronDown
                          style={{ 
                            transform: showGovtDetails ? 'rotate(180deg)' : 'rotate(0deg)', 
                            transition: 'transform 0.3s' 
                          }}
                        />
                      </Button>
                      
                      {/* Government Details Popup */}
                      <AnimatePresence>
                        {showGovtDetails && (
                          <motion.div 
                            className="absolute right-0 mt-1 w-72 bg-white rounded shadow-lg z-30 border p-3"
                            style={{ borderColor: colors.muted }}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.2 }}
                          >
                            <h4 className="text-sm font-semibold mb-2 pb-1 border-b" style={{ color: colors.primary, borderColor: colors.muted + '50' }}>
                              Optional Government Details
                            </h4>
                            <div className="grid grid-cols-1 gap-2">
                              <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: colors.muted }}>
                                  SSS Number
                                </label>
                                <input 
                                  type="text" 
                                  name="sssNumber" 
                                  placeholder="SSS Number" 
                                  value={formData.sssNumber} 
                                  onChange={handleInputChange}
                                  className="p-1.5 rounded border w-full text-sm"
                                  style={{ borderColor: colors.muted }} 
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: colors.muted }}>
                                  TIN Number
                                </label>
                                <input 
                                  type="text" 
                                  name="tinNumber" 
                                  placeholder="TIN Number" 
                                  value={formData.tinNumber} 
                                  onChange={handleInputChange}
                                  className="p-1.5 rounded border w-full text-sm"
                                  style={{ borderColor: colors.muted }} 
                                />
                              </div>
                              
                              <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: colors.muted }}>
                                  PhilHealth Number
                                </label>
                                <input 
                                  type="text" 
                                  name="philHealthNumber" 
                                  placeholder="PhilHealth Number" 
                                  value={formData.philHealthNumber} 
                                  onChange={handleInputChange}
                                  className="p-1.5 rounded border w-full text-sm"
                                  style={{ borderColor: colors.muted }} 
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>                  {/* Three-column grid layout for better space utilization */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Profile Picture - Column 1 */}
                    <div className="md:col-span-3">
                      <div className="flex flex-col items-center">
                        {/* Profile Picture */}
                        <div className="relative group mb-3">
                          <motion.div className="relative">
                            <StaffAvatar 
                              imagePath={formData.profilePicture}
                              alt="Staff profile"
                              size={120}
                              className="border-2 border-dashed rounded-sm cursor-pointer shadow-sm"
                            />                            <motion.label 
                              htmlFor="profileUpload" 
                              className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-black hover:bg-opacity-20 rounded-sm transition-all"
                              whileHover={{ 
                                borderColor: colors.accent
                              }}
                            >
                              {formData.profilePicture && (
                                <div className="flex flex-col items-center justify-center text-center">
                                  <FiCamera size={18} style={{ color: 'white' }} />
                                  <span className="text-xs mt-1" style={{ color: 'white' }}>
                                    Change
                                  </span>
                                </div>
                              )}
                            </motion.label>
                          </motion.div>
                          <input 
                            id="profileUpload"
                            type="file" 
                            accept="image/jpeg,image/png,image/gif,image/webp" 
                            onChange={handleImageUpload} 
                            className="hidden" 
                          />
                          {formData.profilePicture && !formData.profilePicture.startsWith('data:') && (
                            <button 
                              onClick={() => setFormData(prev => ({ ...prev, profilePicture: '' }))} 
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 text-xs"
                              title="Remove image"
                            >
                              <FiTrash size={10} />
                            </button>
                          )}
                        </div>
                        
                        {/* PIN Code - Placed under profile picture */}
                        <div className="w-full">
                          <label className="block text-xs font-medium mb-1" style={{ color: colors.primary }}>
                            PIN Code
                          </label>
                          <input 
                            type="text" 
                            name="pinCode" 
                            placeholder="4-6 digits" 
                            value={formData.pinCode}
                            onChange={handleInputChange} 
                            className="p-2 rounded border w-full text-sm text-center font-medium"
                            style={{ borderColor: formErrors.pinCode ? colors.accent : colors.muted }}
                            maxLength={6}
                          />
                          {formErrors.pinCode && (
                            <div className="text-xs text-red-500 mt-1">{formErrors.pinCode}</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Staff Information - Column 2 */}
                    <div className="md:col-span-5">
                      <h3 className="text-sm font-semibold border-b pb-1 mb-3" style={{ color: colors.primary, borderColor: colors.muted + '40' }}>
                        Staff Information
                      </h3>
                      
                      {/* Staff info fields */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: colors.primary }}>
                            Full Name
                          </label>
                          <input 
                            type="text" 
                            name="name" 
                            placeholder="Full Name" 
                            value={formData.name} 
                            onChange={handleInputChange}
                            className="p-2 rounded border w-full text-sm" 
                            style={{ borderColor: formErrors.name ? colors.accent : colors.muted }}
                          />
                          {formErrors.name && (
                            <div className="text-xs text-red-500 mt-1">{formErrors.name}</div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: colors.primary }}>
                            Position
                          </label>
                          <select 
                            name="position" 
                            value={formData.position} 
                            onChange={handleInputChange}
                            className="p-2 rounded border w-full text-sm" 
                            style={{ borderColor: formErrors.position ? colors.accent : colors.muted }}
                          >
                            <option value="">Select Position</option>
                            {positionOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                          {formErrors.position && (
                            <div className="text-xs text-red-500 mt-1">{formErrors.position}</div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: colors.primary }}>
                            Phone Number
                          </label>
                          <input 
                            type="tel" 
                            name="phone" 
                            placeholder="09123456789" 
                            value={formData.phone}
                            onChange={handleInputChange} 
                            className="p-2 rounded border w-full text-sm"
                            style={{ borderColor: formErrors.phone ? colors.accent : colors.muted }}
                          />
                          {formErrors.phone && (
                            <div className="text-xs text-red-500 mt-1">{formErrors.phone}</div>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: colors.primary }}>
                            Daily Rate
                          </label>
                          <input 
                            type="number" 
                            name="dailyRate" 
                            placeholder="Daily Rate" 
                            value={formData.dailyRate}
                            onChange={handleInputChange} 
                            className="p-2 rounded border w-full text-sm"
                            style={{ borderColor: formErrors.dailyRate ? colors.accent : colors.muted }}
                          />
                          {formErrors.dailyRate && (
                            <div className="text-xs text-red-500 mt-1">{formErrors.dailyRate}</div>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: colors.primary }}>
                            Status
                          </label>
                          <select 
                            name="status" 
                            value={formData.status} 
                            onChange={handleInputChange}
                            className="p-2 rounded border w-full text-sm" 
                            style={{ borderColor: formErrors.status ? colors.accent : colors.muted }}
                          >
                            {statusOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Account Details - Column 3 */}
                    <div className="md:col-span-4 md:border-l md:pl-4" style={{ borderColor: colors.muted + '30' }}>
                      <h3 className="text-sm font-semibold border-b pb-1 mb-3" style={{ color: colors.primary, borderColor: colors.muted + '30' }}>
                        Account Details
                      </h3>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: colors.primary }}>
                            Username
                          </label>
                          <input 
                            type="text" 
                            name="username" 
                            placeholder="Username" 
                            value={formData.username}
                            onChange={handleInputChange} 
                            className="p-2 rounded border w-full text-sm"
                            style={{ borderColor: formErrors.username ? colors.accent : colors.muted }}
                          />
                          {formErrors.username && (
                            <div className="text-xs text-red-500 mt-1">{formErrors.username}</div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: colors.primary }}>
                            Email
                          </label>
                          <input 
                            type="email" 
                            name="email" 
                            placeholder="email@example.com" 
                            value={formData.email} 
                            onChange={handleInputChange}
                            className="p-2 rounded border w-full text-sm"
                            style={{ borderColor: formErrors.email ? colors.accent : colors.muted }}
                          />
                          {formErrors.email && (
                            <div className="text-xs text-red-500 mt-1">{formErrors.email}</div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: colors.primary }}>
                            Password {editMode && <span className="text-xs font-normal">(leave empty to keep current)</span>}
                          </label>
                          <input 
                            type="password" 
                            name="password" 
                            placeholder={editMode ? "Leave empty to keep current" : "Min. 8 characters"} 
                            value={formData.password}
                            onChange={handleInputChange} 
                            className="p-2 rounded border w-full text-sm"
                            style={{ borderColor: formErrors.password ? colors.accent : colors.muted }}
                            required={!editMode} 
                          />
                          {formErrors.password && (
                            <div className="text-xs text-red-500 mt-1">{formErrors.password}</div>
                          )}
                        </div>
                      </div>
                    </div>                  </div>

                    {/* Action Buttons */}                  <div className="mt-4 pt-3 border-t flex justify-end" style={{ borderColor: colors.muted + '30' }}>
                    <div className="flex flex-wrap gap-2 justify-end">
                      {editMode && (
                        <Button 
                          onClick={resetForm}
                          variant="secondary"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      )}
                      {!editMode ? (
                        <Button 
                          onClick={handleAddStaff}
                          variant="primary"
                          size="sm"
                        >
                          <FiSave className="inline mr-1" size={14} />
                          Add Staff Member
                        </Button>
                      ) : (
                        <>
                          <Button 
                            onClick={() => handleSaveStaffOnly()}
                            variant="secondary"
                            size="sm"
                          >
                            <FiSave className="inline mr-1" size={12} />
                            Update Staff Only
                          </Button>
                          <Button 
                            onClick={() => handleSaveAccountOnly()}
                            variant="accent"
                            size="sm"
                          >
                            <FiUser className="inline mr-1" size={12} />
                            Update Account Only
                          </Button>
                          <Button 
                            onClick={handleSaveEdit}
                            variant="primary"
                            size="sm"
                          >
                            <FiSave className="inline mr-1" size={12} />
                            Update Both
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Overlay click catcher to close government details dropdown when clicked outside */}
                  {showGovtDetails && (
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowGovtDetails(false)}
                    ></div>
                  )}
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Work ID Modal */}
      <AnimatePresence>
        {isModalOpen && selectedStaff && (
          <WorkIDModal 
            staff={selectedStaff} 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            colors={colors}
          />
        )}
      </AnimatePresence>
    </div>
  );
};;

export default StaffManagement;
