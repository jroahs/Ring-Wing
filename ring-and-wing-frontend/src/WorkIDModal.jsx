import { useState } from 'react';
import { FiX, FiCamera, FiChevronDown, FiUser, FiDownload } from 'react-icons/fi';
import { motion } from 'framer-motion';

const WorkIDModal = ({ staff, onClose, colors }) => {
  const [showGovtDetails, setShowGovtDetails] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!staff) return null;
  
  // Fallback values if colors aren't provided
  const defaultColors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b'
  };
  
  const modalColors = colors || defaultColors;

  // Format ID and government numbers
  const formatID = (id) => `#${id.toString().slice(-8).toUpperCase().match(/.{1,4}/g)?.join('-')}`;
  const formatGovtNumber = (num) => num?.match(/.{1,4}/g)?.join('-') || 'N/A';

  // New function to format date properly
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }).format(date);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  const handleDownload = () => {
    // This will be implemented in the future if needed
    alert('ID Card download feature coming soon!');
  };

  // Card animation variants
  const cardVariants = {
    hidden: { opacity: 0, rotateY: 90 },
    visible: { 
      opacity: 1, 
      rotateY: 0,
      transition: { 
        duration: 0.6,
        type: "spring",
        stiffness: 100
      } 
    },
    hover: {
      boxShadow: "0px 10px 20px rgba(0,0,0,0.2)",
      translateY: -5,
      transition: { duration: 0.3 }
    }
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl">
        <div 
          className="relative rounded-xl overflow-hidden transform transition-transform duration-300 hover:rotate-1 hover:scale-105"
          style={{
            backgroundColor: colors.background,
            border: `4px solid ${colors.primary}`,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            minHeight: '240px'
          }}
        >
          {/* ID Card Container */}
          <div className="flex flex-col md:flex-row">
            {/* Left Section - Photo & Security Features */}
            <div 
              className="w-full md:w-1/3 relative p-6"
              style={{
                backgroundColor: colors.accent + '15',
                borderRight: `3px solid ${colors.primary}`
              }}
            >
              {/* Diagonal Accent Stripe */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${colors.accent} 0%, transparent 30%)`,
                  mixBlendMode: 'multiply'
                }}
              />

              {/* Photo Area */}
              <div className="relative z-10">
                <div 
                  className="w-full aspect-square rounded-lg overflow-hidden mb-4"
                  style={{ border: `3px solid ${colors.primary}` }}
                >
                  {staff.profilePicture && !imageError ? (
                    <img
                      src={staff.profilePicture}
                      alt="Staff"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.log('Image failed to load, using placeholder');
                        setImageError(true);
                        // Prevent infinite error loops
                        e.target.onerror = null;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <FiCamera className="text-4xl" style={{ color: colors.muted }} />
                    </div>
                  )}
                </div>

                {/* ID Number */}
                <div className="text-center">
                  <div className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.muted }}>
                    Employee ID
                  </div>
                  <div 
                    className="font-mono text-lg font-bold break-all px-2"
                    style={{ color: colors.primary }}
                  >
                    {formatID(staff._id)}
                  </div>
                </div>
              </div>

              {/* Hologram Sticker */}
              <div 
                className="absolute bottom-4 right-4 w-16 h-16 rounded-full overflow-hidden transform rotate-12"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${colors.accent}, ${colors.background})`,
                  border: `2px solid ${colors.primary}`
                }}
              >
                <div className="absolute inset-0 bg-noise opacity-30" />
              </div>
            </div>

            {/* Right Section - Details */}
            <div className="flex-1 p-6">
              {/* Header */}
              <div className="mb-6">
                <div className="text-xs uppercase tracking-widest" style={{ color: colors.muted }}>
                  Ring & Wing
                </div>
                <h2 className="text-2xl font-bold mt-1" style={{ color: colors.primary }}>
                  Staff Identification Card
                </h2>
              </div>

              {/* Employee Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.muted }}>
                    Full Name
                  </div>
                  <div className="text-xl font-semibold" style={{ color: colors.primary }}>
                    {staff.name}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.muted }}>
                    Position
                  </div>
                  <div className="text-lg font-medium" style={{ color: colors.secondary }}>
                    {staff.position}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.muted }}>
                    Daily Rate
                  </div>
                  <div className="text-md font-semibold" style={{ color: colors.primary }}>
                    ₱{staff.dailyRate?.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.muted }}>
                    Status
                  </div>
                  <div 
                    className="text-sm px-2 py-1 rounded-full inline-block"
                    style={{ 
                      backgroundColor: colors.accent + '20',
                      color: colors.primary
                    }}
                  >
                    {staff.status}
                  </div>
                </div>

                {staff.email && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.muted }}>
                      Email
                    </div>
                    <div className="text-md" style={{ color: colors.primary }}>
                      {staff.email}
                    </div>
                  </div>
                )}

                {staff.phone && (
                  <div>
                    <div className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.muted }}>
                      Phone
                    </div>
                    <div className="text-md" style={{ color: colors.primary }}>
                      {staff.phone}
                    </div>
                  </div>
                )}
              </div>

                {/* Government Details Accordion */}
                <div className="mb-4">
                <button
                  onClick={() => setShowGovtDetails(!showGovtDetails)}
                  className="w-full flex justify-between items-center p-2 hover:bg-gray-50 rounded"
                  style={{ color: colors.primary }}
                >
                  <span>Government Identification Numbers</span>
                  <FiChevronDown className={`transition-transform duration-200 ${showGovtDetails ? 'rotate-180' : ''}`} />
                </button>

                {showGovtDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div>
                      <div className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.muted }}>
                        SSS Number
                      </div>
                      <div className="font-mono" style={{ color: colors.primary }}>
                        {formatGovtNumber(staff.sssNumber)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.muted }}>
                        TIN Number
                      </div>
                      <div className="font-mono" style={{ color: colors.primary }}>
                        {staff.tinNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.muted }}>
                        PhilHealth
                      </div>
                      <div className="font-mono" style={{ color: colors.primary }}>
                        {staff.philHealthNumber}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Signature & Barcode */}
              <div className="border-t pt-4" style={{ borderColor: colors.muted + '30' }}>
                <div className="flex justify-between items-end">
                  <div className="w-48">
                    <div className="text-xs uppercase tracking-widest mb-2" style={{ color: colors.muted }}>
                      Signature
                    </div>
                    <div className="h-12 relative">
                      <div 
                        className="absolute inset-0 bg-repeat opacity-20"
                        style={{ 
                          backgroundImage: 'linear-gradient(45deg, transparent 50%, #00000010 50%)',
                          backgroundSize: '4px 4px'
                        }}
                      />
                      <div className="relative font-signature text-2xl" style={{ color: colors.primary }}>
                        {staff.name.split(' ')[0]}
                      </div>
                    </div>
                  </div>

                  {/* Barcode */}
                  <div 
                    className="w-48 h-16 bg-contain bg-center bg-no-repeat"
                    style={{ 
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                        `<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
                          ${Array.from({ length: 30 }).map((_, i) => `
                            <rect x="${i * 3}" y="0" width="${Math.random() > 0.3 ? 2 : 4}" height="40" fill="${colors.primary}"/>
                          `).join('')}
                        </svg>`
                      )}")`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Security Patterns */}
          <div 
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 10px,
                  ${colors.accent}20 10px,
                  ${colors.accent}20 20px
                )
              `
            }}
          />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-8 -right-8 p-2 rounded-full hover:bg-opacity-20 transition-colors"
          style={{ backgroundColor: colors.primary + '20', color: colors.background }}
        >
          <FiX className="text-2xl" />
        </button>
      </div>
    </div>
  );
};

export default WorkIDModal;