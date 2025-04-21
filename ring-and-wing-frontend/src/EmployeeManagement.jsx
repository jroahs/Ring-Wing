import { useState, useEffect } from 'react';
import { FiUser, FiPlus, FiEdit, FiTrash, FiSave, FiChevronDown, FiCamera } from 'react-icons/fi';
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

  // Sidebar and responsive layout state
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

  // Calculate main content margin
  const getMainContentMargin = () => {
    if (windowWidth < 768) return '0';
    return windowWidth >= 1920 ? '8rem' : '5rem';
  };

  // Staff state
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch staff data from API
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await fetch('/api/staff');
        const data = await response.json();
        const staffWithId = data.map(staff => ({ ...staff, id: staff._id }));
        setStaff(staffWithId);
      } catch (error) {
        console.error('Error fetching staff:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStaff();
  }, []);

  // Modal and form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showGovtDetails, setShowGovtDetails] = useState(false);
  const statusOptions = ['Active', 'On Leave', 'Inactive'];

  // Form data state
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

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          profilePicture: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Input change handler
  const handleInputChange = (e) => {
    setFormData({ 
      ...formData, 
      [e.target.name]: e.target.value 
    });
  };

  // Add new staff member
  const handleAddStaff = async () => {
    if (!formData.name || !formData.position) return;

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          dailyRate: Number(formData.dailyRate) || 0
        }),
      });
      const newStaff = await response.json();
      setStaff([...staff, { ...newStaff, id: newStaff._id }]);
      resetForm();
    } catch (error) {
      console.error('Error adding staff:', error);
    }
  };

  // Edit staff member
  const handleEditStaff = (staffMember) => {
    setEditMode(true);
    setFormData(staffMember);
  };

  // Update staff member
  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/staff/${formData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          dailyRate: Number(formData.dailyRate)
        }),
      });
      const updatedStaff = await response.json();
      setStaff(staff.map(s => s.id === formData.id ? { ...updatedStaff, id: updatedStaff._id } : s));
      resetForm();
    } catch (error) {
      console.error('Error updating staff:', error);
    }
  };

  // Delete staff member
  const handleDeleteStaff = async (id) => {
    try {
      await fetch(`/api/staff/${id}`, {
        method: 'DELETE',
      });
      setStaff(staff.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting staff:', error);
    }
  };

  // Reset form
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
          marginLeft: getMainContentMargin(),
          paddingTop: windowWidth < 768 ? '4rem' : '0'
        }}
      >
        <div className="p-6 md:p-8">
          <h1 className="text-3xl font-bold mb-6" style={{ color: colors.primary }}>
            <FiUser className="inline mr-2" />
            Staff Management
          </h1>

          {isLoading ? (
            <div className="text-center" style={{ color: colors.primary }}>
              Loading staff members...
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
                    {staff.map((staffMember) => (
                      <div
                        key={staffMember.id}
                        className="p-3 rounded flex justify-between items-center"
                        style={{
                          backgroundColor: colors.background,
                          color: colors.primary,
                          border: `1px solid ${colors.muted}`
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 bg-cover bg-center border rounded-sm"
                            style={{ 
                              backgroundImage: `url(${staffMember.profilePicture || 'https://via.placeholder.com/150'})`,
                              borderColor: colors.muted,
                              backgroundSize: 'contain',
                              backgroundRepeat: 'no-repeat'
                            }}
                          ></div>
                          <div>
                            <p className="font-medium">{staffMember.name}</p>
                            <p className="text-sm" style={{ color: colors.muted }}>
                              {staffMember.position}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedStaff(staffMember);
                              setIsModalOpen(true);
                            }}
                            className="p-1 hover:opacity-70"
                            style={{ color: colors.accent }}
                          >
                            <FiUser />
                          </button>
                          <button
                            onClick={() => handleEditStaff(staffMember)}
                            className="p-1 hover:opacity-70"
                            style={{ color: colors.secondary }}
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staffMember.id)}
                            className="p-1 hover:opacity-70"
                            style={{ color: colors.muted }}
                          >
                            <FiTrash />
                          </button>
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
                  
                  {/* Profile Picture Upload */}
                  <div className="mb-4 flex items-center gap-4">
                    <div className="relative group">
                      <label 
                        htmlFor="profileUpload"
                        className="w-24 h-24 border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-solid rounded-sm bg-gray-100"
                        style={{ 
                          borderColor: colors.muted,
                          backgroundImage: `url(${formData.profilePicture})`,
                          backgroundSize: 'contain',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat'
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
                          onClick={() => setFormData({ ...formData, profilePicture: '' })}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-sm px-1 hover:bg-red-600"
                        >
                          <FiTrash className="text-sm" />
                        </button>
                      )}
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: colors.muted }}>
                        Upload 1x1 picture
                        <br />
                        (Recommended size: 500x500px)
                      </p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="p-2 rounded border"
                      style={{ borderColor: colors.muted }}
                    />
                    <input
                      type="text"
                      name="position"
                      placeholder="Position"
                      value={formData.position}
                      onChange={handleInputChange}
                      className="p-2 rounded border"
                      style={{ borderColor: colors.muted }}
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="p-2 rounded border"
                      style={{ borderColor: colors.muted }}
                    />
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Phone Number"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="p-2 rounded border"
                      style={{ borderColor: colors.muted }}
                    />
                    <div className="relative">
                      <input
                        type="number"
                        name="dailyRate"
                        placeholder="Daily Rate"
                        value={formData.dailyRate}
                        onChange={handleInputChange}
                        className="p-2 rounded border w-full"
                        style={{ borderColor: colors.muted }}
                      />
                      <span className="absolute right-3 top-3" style={{ color: colors.muted }}>₱</span>
                    </div>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="p-2 rounded border"
                      style={{ borderColor: colors.muted }}
                    >
                      {statusOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  {/* Government Details */}
                  <div className="mb-4">
                    <button
                      onClick={() => setShowGovtDetails(!showGovtDetails)}
                      className="w-full flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                      style={{ color: colors.primary }}
                    >
                      <span>Government Details</span>
                      <FiChevronDown className={`transition-transform duration-200 ${showGovtDetails ? 'rotate-180' : ''}`} />
                    </button>

                    {showGovtDetails && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <input
                          type="text"
                          name="sssNumber"
                          placeholder="SSS Number"
                          value={formData.sssNumber}
                          onChange={handleInputChange}
                          className="p-2 rounded border"
                          style={{ borderColor: colors.muted }}
                        />
                        <input
                          type="text"
                          name="tinNumber"
                          placeholder="TIN Number"
                          value={formData.tinNumber}
                          onChange={handleInputChange}
                          className="p-2 rounded border"
                          style={{ borderColor: colors.muted }}
                        />
                        <input
                          type="text"
                          name="philHealthNumber"
                          placeholder="PhilHealth Number"
                          value={formData.philHealthNumber}
                          onChange={handleInputChange}
                          className="p-2 rounded border"
                          style={{ borderColor: colors.muted }}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={editMode ? handleSaveEdit : handleAddStaff}
                    className="w-full py-2 rounded font-semibold transition-opacity hover:opacity-90"
                    style={{ backgroundColor: colors.accent, color: colors.background }}
                  >
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
        <WorkIDModal 
          staff={selectedStaff} 
          onClose={() => setIsModalOpen(false)} 
          colors={colors} 
        />
      )}
    </div>
  );
};

export default StaffManagement;