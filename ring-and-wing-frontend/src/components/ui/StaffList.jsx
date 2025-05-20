import React from 'react';
import { FiEdit, FiTrash, FiUser } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import StaffAvatar from '../StaffAvatar';
import { Button } from './Button';

const StaffList = ({ staff, setSelectedStaff, setIsModalOpen, handleEditStaff, handleDeleteStaff, colors }) => {
  // Animation variants
  const listItemVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { type: "tween", duration: 0.2 }
    },
    hover: { 
      scale: 1.01,
      transition: { type: "tween", duration: 0.1 } 
    },
    tap: { scale: 0.99 }
  };

  return (
    <div className="rounded-lg p-4 shadow-sm h-full" style={{ backgroundColor: colors.primary }}>
      <h2 className="text-xl font-semibold mb-4" style={{ color: colors.background }}>
        <FiUser className="inline mr-2" />
        Staff Members
      </h2>
      
      <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
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
                </div>
                
                <div className="flex gap-2">
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
  );
};

export default StaffList;
