import React from 'react';
import { motion } from 'framer-motion';
import { FiCamera, FiChevronDown, FiSave, FiTrash, FiUser } from 'react-icons/fi';
import { Button } from './Button';
import { PasswordInput } from './PasswordInput';
import StaffAvatar from '../StaffAvatar';

const StaffForm = ({
  formData,
  formErrors,
  editMode,
  handleInputChange,
  handleImageUpload,
  showGovtDetails,
  setShowGovtDetails,
  statusOptions,
  positionOptions,
  resetForm,
  handleAddStaff,
  handleSaveStaffOnly,
  handleSaveAccountOnly,
  handleSaveEdit,
  colors
}) => {
  return (
    <motion.div 
      className="rounded-lg p-5 shadow-sm relative" 
      style={{ border: `1px solid ${colors.muted}` }}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
    >
      <div className="flex justify-between items-center mb-4">
        <motion.h2 
          className="text-xl font-semibold" 
          style={{ color: colors.primary }}
          layout
        >
          <FiUser className="inline mr-2" />
          <motion.span
            key={editMode ? 'edit' : 'add'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {editMode ? 'Edit Staff Member' : 'Add New Staff'}
          </motion.span>
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
        </div>
      </div>

      {/* Optimized Three-column grid layout */}
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
                />
                <motion.label 
                  htmlFor="profileUpload" 
                  className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-black hover:bg-opacity-20 rounded-sm transition-all"
                  whileHover={{ 
                    borderColor: colors.accent
                  }}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <FiCamera size={18} style={{ color: formData.profilePicture ? 'white' : colors.muted }} />
                    <span className="text-xs mt-1" style={{ color: formData.profilePicture ? 'white' : colors.muted }}>
                      {formData.profilePicture ? 'Change' : 'Upload'}
                    </span>
                  </div>
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
              <PasswordInput
                label={`Password ${editMode ? '(leave empty to keep current)' : ''}`}
                placeholder={editMode ? "Leave empty to keep current" : "Min. 8 characters"}
                value={formData.password}
                onChange={(e) => handleInputChange({ target: { name: 'password', value: e.target.value } })}
                className="p-2 rounded border w-full text-sm"
                style={{ borderColor: formErrors.password ? colors.accent : colors.muted }}
                required={!editMode}
                error={formErrors.password}
                useCustomStyling={true}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons with proper Button component */}
      <div className="mt-4 pt-3 border-t flex justify-end" style={{ borderColor: colors.muted + '30' }}>
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

      {/* Overlay click catcher to close government details dropdown */}
      {showGovtDetails && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowGovtDetails(false)}
        ></div>
      )}
    </motion.div>
  );
};

export default StaffForm;
