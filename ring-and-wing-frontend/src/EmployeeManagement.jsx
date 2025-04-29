import { useState, useEffect } from 'react';
import { FiUser, FiPlus, FiEdit, FiTrash, FiSave, FiChevronDown, FiCamera } from 'react-icons/fi';
import axios from 'axios';
import Sidebar from './Sidebar';
import WorkIDModal from './WorkIDModal';

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
  const [emailError, setEmailError] = useState('');
  const statusOptions = ['Active', 'On Leave', 'Inactive'];
  const positionOptions = ['Barista', 'Cashier', 'Chef', 'Manager', 'Server', 'Cook'];

  const [formData, setFormData] = useState({
    name: '',
    position: '',
    profilePicture: '',
    email: '',
    phone: '',
    dailyRate: '',
    status: 'Active',
    sssNumber: '',
    tinNumber: '',
    philHealthNumber: ''
  });

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await axios.get('/api/staff');
        setStaff(response.data);
      } catch (error) {
        console.error('Error fetching staff:', error);
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
    
    if (name === 'email') setEmailError('');
    
    if (['phone', 'sssNumber', 'tinNumber', 'philHealthNumber'].includes(name)) {
      const cleaned = value.replace(/\D/g, '');
      setFormData(prev => ({ ...prev, [name]: cleaned }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddStaff = async () => {
    try {
      setEmailError('');
      const newStaff = {
        ...formData,
        dailyRate: Number(formData.dailyRate),
        phone: formData.phone.startsWith('0') ? formData.phone : `0${formData.phone}`
      };

      const response = await axios.post('/api/staff', newStaff);
      setStaff(prev => [...prev, response.data]);
      resetForm();
    } catch (error) {
      if (error.response?.data?.message === 'Email already exists') {
        setEmailError('Email already exists!');
      } else {
        console.error('Error adding staff:', error);
      }
    }
  };

  const handleEditStaff = (staffMember) => {
    setEditMode(true);
    setFormData({
      ...staffMember,
      phone: staffMember.phone.replace('+63', '0'),
      dailyRate: staffMember.dailyRate.toString()
    });
  };

  const handleSaveEdit = async () => {
    try {
      setEmailError('');
      const updatedData = {
        ...formData,
        dailyRate: Number(formData.dailyRate),
        phone: formData.phone.startsWith('0') ? formData.phone : `0${formData.phone}`
      };

      const response = await axios.put(`/api/staff/${formData._id}`, updatedData);
      setStaff(prev => 
        prev.map(s => s._id === formData._id ? response.data : s)
      );
      resetForm();
    } catch (error) {
      if (error.response?.data?.message === 'Email already exists') {
        setEmailError('Email already exists!');
      } else {
        console.error('Error updating staff:', error);
      }
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      await axios.delete(`/api/staff/${id}`);
      setStaff(prev => prev.filter(s => s._id !== id));
    } catch (error) {
      console.error('Error deleting staff:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      profilePicture: '',
      email: '',
      phone: '',
      dailyRate: '',
      status: 'Active',
      sssNumber: '',
      tinNumber: '',
      philHealthNumber: ''
    });
    setEditMode(false);
    setShowGovtDetails(false);
    setEmailError('');
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} colors={colors} />
      
      <div className="flex-1 transition-all duration-300" style={{
        marginLeft: windowWidth < 768 ? '0' : windowWidth >= 1920 ? '8rem' : '5rem',
        paddingTop: windowWidth < 768 ? '4rem' : '0'
      }}>
        <div className="p-6 md:p-8">
          <h1 className="text-3xl font-bold mb-6" style={{ color: colors.primary }}>
            <FiUser className="inline mr-2" />
            Staff Management
          </h1>

          {isLoading ? (
            <div className="text-center" style={{ color: colors.primary }}>Loading staff members...</div>
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
                    {staff.map(staffMember => (
                      <div key={staffMember._id} className="p-3 rounded flex justify-between items-center"
                        style={{ backgroundColor: colors.background, color: colors.primary, border: `1px solid ${colors.muted}` }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cover bg-center border rounded-sm"
                            style={{ 
                              backgroundImage: `url(${staffMember.profilePicture || 'https://via.placeholder.com/150'})`,
                              borderColor: colors.muted
                            }} />
                          <div>
                            <p className="font-medium">{staffMember.name}</p>
                            <p className="text-sm" style={{ color: colors.muted }}>{staffMember.position}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => { setSelectedStaff(staffMember); setIsModalOpen(true); }}
                            className="p-1 hover:opacity-70" style={{ color: colors.accent }}><FiUser /></button>
                          <button onClick={() => handleEditStaff(staffMember)}
                            className="p-1 hover:opacity-70" style={{ color: colors.secondary }}><FiEdit /></button>
                          <button onClick={() => handleDeleteStaff(staffMember._id)}
                            className="p-1 hover:opacity-70" style={{ color: colors.muted }}><FiTrash /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Add/Edit Form */}
              <div className="lg:col-span-2">
                <div className="rounded-lg p-6 shadow-sm" style={{ border: `1px solid ${colors.muted}` }}>
                  <h2 className="text-xl font-semibold mb-4" style={{ color: colors.primary }}>
                    <FiPlus className="inline mr-2" />
                    {editMode ? 'Edit Staff Member' : 'Add New Staff'}
                  </h2>

                  <div className="mb-4 flex items-center gap-4">
                    <div className="relative group">
                      <label 
                        htmlFor="profileUpload" 
                        className="w-24 h-24 border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-solid rounded-sm bg-gray-100 overflow-hidden"
                        style={{ 
                          borderColor: colors.muted,
                          backgroundImage: `url(${formData.profilePicture})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          aspectRatio: '1/1'
                        }}
                      >
                        {!formData.profilePicture && (
                          <FiCamera className="text-2xl" style={{ color: colors.muted }} />
                        )}
                      </label>
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
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-sm px-1 hover:bg-red-600"
                        >
                          <FiTrash className="text-sm" />
                        </button>
                      )}
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: colors.muted }}>
                        Upload 1x1 picture<br />(Recommended size: 500x500px)
                      </p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange}
                      className="p-2 rounded border" style={{ borderColor: colors.muted }} required />
                    
                    <select name="position" value={formData.position} onChange={handleInputChange}
                      className="p-2 rounded border" style={{ borderColor: colors.muted }} required>
                      <option value="">Select Position</option>
                      {positionOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>

                    <div className="relative">
                      <input 
                        type="email" 
                        name="email" 
                        placeholder="Email" 
                        value={formData.email} 
                        onChange={handleInputChange}
                        className={`p-2 rounded border ${emailError ? 'border-red-500' : ''}`}
                        style={{ borderColor: emailError ? colors.accent : colors.muted }} 
                        required 
                      />
                      {emailError && (
                        <span className="absolute right-2 top-3 text-red-500 text-sm">
                          {emailError}
                        </span>
                      )}
                    </div>

                    <input type="tel" name="phone" placeholder="Phone Number (09123456789)" value={formData.phone}
                      onChange={handleInputChange} className="p-2 rounded border"
                      style={{ borderColor: colors.muted }} required />

                    <div className="relative">
                      <input type="number" name="dailyRate" placeholder="Daily Rate" value={formData.dailyRate}
                        onChange={handleInputChange} className="p-2 rounded border w-full"
                        style={{ borderColor: colors.muted }} required min="0" />
                      <span className="absolute right-3 top-3" style={{ color: colors.muted }}>₱</span>
                    </div>

                    <select name="status" value={formData.status} onChange={handleInputChange}
                      className="p-2 rounded border" style={{ borderColor: colors.muted }}>
                      {statusOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  {/* Government Details */}
                  <div className="mb-4">
                    <button type="button" onClick={() => setShowGovtDetails(!showGovtDetails)}
                      className="w-full flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                      style={{ color: colors.primary }}>
                      <span>Government Details (Optional)</span>
                      <FiChevronDown className={`transition-transform duration-200 ${showGovtDetails ? 'rotate-180' : ''}`} />
                    </button>

                    {showGovtDetails && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <input type="text" name="sssNumber" placeholder="SSS Number"
                          value={formData.sssNumber} onChange={handleInputChange} className="p-2 rounded border"
                          style={{ borderColor: colors.muted }} />
                        
                        <input type="text" name="tinNumber" placeholder="TIN Number"
                          value={formData.tinNumber} onChange={handleInputChange} className="p-2 rounded border"
                          style={{ borderColor: colors.muted }} />
                        
                        <input type="text" name="philHealthNumber" placeholder="PhilHealth Number"
                          value={formData.philHealthNumber} onChange={handleInputChange} className="p-2 rounded border"
                          style={{ borderColor: colors.muted }} />
                      </div>
                    )}
                  </div>

                  <button type="button" onClick={editMode ? handleSaveEdit : handleAddStaff}
                    className="w-full py-2 rounded font-semibold transition-opacity hover:opacity-90"
                    style={{ backgroundColor: colors.accent, color: colors.background }}>
                    <FiSave className="inline mr-2" />
                    {editMode ? 'Save Changes' : 'Add Staff Member'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Work ID Modal */}
      {isModalOpen && selectedStaff && (
        <WorkIDModal staff={selectedStaff} onClose={() => setIsModalOpen(false)} colors={colors} />
      )}
    </div>
  );
};

export default StaffManagement;