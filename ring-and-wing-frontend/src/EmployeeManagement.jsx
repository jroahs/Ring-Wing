import { useState, useEffect } from 'react';
import { FiUser, FiPlus, FiEdit, FiTrash, FiSave, FiChevronDown, FiCamera } from 'react-icons/fi';
import axios from 'axios';
import Sidebar from './Sidebar';
import WorkIDModal from './WorkIDModal';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

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
        
        const fetchPromise = axios.get('/api/staff');
        
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profilePicture: reader.result }));
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

    // PIN validation - must be 4-6 digits
    if (!formData.pinCode.trim()) {
      errors.pinCode = 'PIN code is required';
    } else if (!/^\d{4,6}$/.test(formData.pinCode)) {
      errors.pinCode = 'PIN must be 4-6 digits';
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

      const response = await axios.post('/api/staff', payload);
      setStaff([...staff, response.data]);
      resetForm();
      toast.success('Staff member added successfully');
    } catch (error) {
      console.error('Error adding staff:', error);
      toast.error(error.response?.data?.message || 'Failed to add staff member');
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
      
      const response = await axios.put(`/api/staff/${selectedStaff._id}`, payload);

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
      
      const response = await axios.put(`/api/staff/${selectedStaff._id}`, payload);

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
      
      const response = await axios.put(`/api/staff/${selectedStaff._id}`, payload);

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
      await axios.delete(`/api/staff/${id}`);
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
                          >
                            <div className="flex items-center gap-3">
                              <motion.div 
                                className="w-10 h-10 bg-cover bg-center border rounded-sm overflow-hidden"
                                style={{ 
                                  backgroundImage: `url(${staffMember.profilePicture || 'https://via.placeholder.com/150'})`,
                                  borderColor: colors.muted
                                }}
                                whileHover={{ scale: 1.15 }}
                                transition={{ type: "spring", stiffness: 300 }}
                              />
                              <div>
                                <p className="font-medium">{staffMember.name}</p>
                                <p className="text-sm" style={{ color: colors.muted }}>{staffMember.position}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <motion.button 
                                onClick={() => { setSelectedStaff(staffMember); setIsModalOpen(true); }}
                                className="p-1 hover:opacity-70" 
                                style={{ color: colors.accent }}
                                whileHover={{ scale: 1.2, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <FiUser />
                              </motion.button>
                              <motion.button 
                                onClick={() => handleEditStaff(staffMember)}
                                className="p-1 hover:opacity-70" 
                                style={{ color: colors.secondary }}
                                whileHover={{ scale: 1.2, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <FiEdit />
                              </motion.button>
                              <motion.button 
                                onClick={() => handleDeleteStaff(staffMember._id)}
                                className="p-1 hover:opacity-70" 
                                style={{ color: colors.muted }}
                                whileHover={{ scale: 1.2, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <FiTrash />
                              </motion.button>
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
                      <motion.button 
                        type="button" 
                        onClick={() => setShowGovtDetails(!showGovtDetails)}
                        className="flex items-center gap-1 px-3 py-1 rounded-full text-xs"
                        style={{ 
                          backgroundColor: showGovtDetails ? colors.primary + '15' : 'transparent',
                          color: colors.primary,
                          border: `1px solid ${colors.muted}`
                        }}
                        whileHover={{ backgroundColor: colors.primary + '10' }}
                      >
                        <span className="font-medium">Government Details</span>
                        <FiChevronDown
                          style={{ 
                            transform: showGovtDetails ? 'rotate(180deg)' : 'rotate(0deg)', 
                            transition: 'transform 0.3s' 
                          }}
                        />
                      </motion.button>
                      
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
                  </div>
                  
                  {/* More compact two-column layout */}
                  <div className="flex flex-col md:flex-row gap-2">
                    {/* Staff Information with Profile Picture */}
                    <div className="md:w-1/2 pr-2">
                      <div className="flex items-start mb-2">
                        {/* Profile Picture */}
                        <div className="relative group mr-3">
                          <motion.label 
                            htmlFor="profileUpload" 
                            className="w-16 h-16 border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-solid rounded-sm bg-gray-100 overflow-hidden"
                            style={{ 
                              borderColor: colors.muted,
                              backgroundImage: `url(${formData.profilePicture})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center'
                            }}
                            whileHover={{ 
                              borderColor: colors.accent
                            }}
                          >
                            {!formData.profilePicture && <FiCamera size={16} style={{ color: colors.muted }} />}
                          </motion.label>
                          <input 
                            id="profileUpload"
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="hidden" 
                          />
                          {formData.profilePicture && (
                            <button 
                              onClick={() => setFormData(prev => ({ ...prev, profilePicture: '' }))} 
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-sm px-1 hover:bg-red-600 text-xs"
                            >
                              <FiTrash size={10} />
                            </button>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="text-xs font-semibold border-b pb-1 mb-1" style={{ color: colors.primary, borderColor: colors.muted + '30' }}>
                            Staff Information
                          </h3>
                          
                          <div className="flex flex-wrap -mx-1">
                            <div className="px-1 w-full">
                              <label className="block text-xs font-medium" style={{ color: colors.muted }}>
                                Full Name
                              </label>
                              <input 
                                type="text" 
                                name="name" 
                                placeholder="Full Name" 
                                value={formData.name} 
                                onChange={handleInputChange}
                                className="p-1 rounded border w-full text-xs" 
                                style={{ borderColor: formErrors.name ? colors.accent : colors.muted }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Compact staff info fields */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <div>
                          <label className="block text-xs font-medium" style={{ color: colors.muted }}>
                            Position
                          </label>
                          <select 
                            name="position" 
                            value={formData.position} 
                            onChange={handleInputChange}
                            className="p-1 rounded border w-full text-xs" 
                            style={{ borderColor: formErrors.position ? colors.accent : colors.muted }}
                          >
                            <option value="">Select Position</option>
                            {positionOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium" style={{ color: colors.muted }}>
                            Status
                          </label>
                          <select 
                            name="status" 
                            value={formData.status} 
                            onChange={handleInputChange}
                            className="p-1 rounded border w-full text-xs" 
                            style={{ borderColor: colors.muted }}
                          >
                            {statusOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium" style={{ color: colors.muted }}>
                            Phone Number
                          </label>
                          <input 
                            type="tel" 
                            name="phone" 
                            placeholder="09123456789" 
                            value={formData.phone}
                            onChange={handleInputChange} 
                            className="p-1 rounded border w-full text-xs"
                            style={{ borderColor: formErrors.phone ? colors.accent : colors.muted }}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium" style={{ color: colors.muted }}>
                            Daily Rate (₱)
                          </label>
                          <input 
                            type="number" 
                            name="dailyRate" 
                            placeholder="0.00" 
                            value={formData.dailyRate}
                            onChange={handleInputChange} 
                            className="p-1 rounded border w-full text-xs"
                            style={{ borderColor: formErrors.dailyRate ? colors.accent : colors.muted }}
                            min="0" 
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium" style={{ color: colors.muted }}>
                            PIN Code
                          </label>
                          <input 
                            type="text" 
                            name="pinCode" 
                            placeholder="4-6 digits" 
                            value={formData.pinCode}
                            onChange={handleInputChange} 
                            className="p-1 rounded border w-full text-xs"
                            style={{ borderColor: formErrors.pinCode ? colors.accent : colors.muted }}
                            maxLength={6}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Account Details */}
                    <div className="md:w-1/2 md:border-l pl-2" style={{ borderColor: colors.muted + '30' }}>
                      <h3 className="text-xs font-semibold border-b pb-1 mb-2" style={{ color: colors.primary, borderColor: colors.muted + '30' }}>
                        Account Details
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-y-1">
                        <div>
                          <label className="block text-xs font-medium" style={{ color: colors.muted }}>
                            Username
                          </label>
                          <input 
                            type="text" 
                            name="username" 
                            placeholder="Username" 
                            value={formData.username}
                            onChange={handleInputChange} 
                            className="p-1 rounded border w-full text-xs"
                            style={{ borderColor: formErrors.username ? colors.accent : colors.muted }}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium" style={{ color: colors.muted }}>
                            Email
                          </label>
                          <input 
                            type="email" 
                            name="email" 
                            placeholder="email@example.com" 
                            value={formData.email} 
                            onChange={handleInputChange}
                            className="p-1 rounded border w-full text-xs"
                            style={{ borderColor: formErrors.email ? colors.accent : colors.muted }}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium" style={{ color: colors.muted }}>
                            Password {editMode && <span className="text-xs font-normal">(leave empty to keep current)</span>}
                          </label>
                          <input 
                            type="password" 
                            name="password" 
                            placeholder={editMode ? "Leave empty to keep current" : "Min. 8 characters"} 
                            value={formData.password}
                            onChange={handleInputChange} 
                            className="p-1 rounded border w-full text-xs"
                            style={{ borderColor: formErrors.password ? colors.accent : colors.muted }}
                            required={!editMode} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons - More compact */}
                  <div className="mt-3 pt-2 border-t flex justify-end" style={{ borderColor: colors.muted + '30' }}>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {editMode && (
                        <button 
                          type="button" 
                          onClick={resetForm}
                          className="px-2 py-1 rounded text-xs font-medium border"
                          style={{ borderColor: colors.muted, color: colors.primary }}
                        >
                          Cancel
                        </button>
                      )}
                      {!editMode ? (
                        <button 
                          type="button" 
                          onClick={handleAddStaff}
                          className="px-3 py-1 rounded text-xs font-medium"
                          style={{ backgroundColor: colors.accent, color: colors.background }}
                        >
                          <FiSave className="inline mr-1" size={12} />
                          Add Staff Member
                        </button>
                      ) : (
                        <>
                          <button 
                            type="button" 
                            onClick={() => handleSaveStaffOnly()}
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{ backgroundColor: colors.secondary, color: colors.background }}
                          >
                            <FiSave className="inline mr-1" size={10} />
                            Update Staff Only
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleSaveAccountOnly()}
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{ backgroundColor: colors.primary, color: colors.background }}
                          >
                            <FiUser className="inline mr-1" size={10} />
                            Update Account Only
                          </button>
                          <button 
                            type="button" 
                            onClick={handleSaveEdit}
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{ backgroundColor: colors.accent, color: colors.background }}
                          >
                            <FiSave className="inline mr-1" size={10} />
                            Update Both
                          </button>
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
};

export default StaffManagement;
