import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTablet, FiMessageSquare, FiSmartphone } from 'react-icons/fi';

const colors = {
  primary: '#2e0304',
  background: '#fefdfd',
  accent: '#f1670f',
  secondary: '#853619',
  muted: '#ac9c9b',
  activeBg: '#f1670f20',
  activeBorder: '#f1670f',
  hoverBg: '#f1670f10'
};

const MobileLanding = () => {
  const navigate = useNavigate();

  const handleServiceClick = (path) => {
    navigate(path);
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: colors.background }}
    >
      {/* Simple Header */}
      <div 
        className="text-center py-6 px-4"
        style={{ backgroundColor: colors.primary }}
      >
        <div className="flex items-center justify-center mb-2">
          <FiSmartphone size={28} className="mr-3 text-white" />
          <h1 className="text-2xl font-bold text-white">Mobile Services</h1>
        </div>
        <p className="text-gray-200 text-sm">Choose your service</p>
      </div>

      {/* Main Content - Mobile Optimized */}
      <div className="flex-1 px-4 py-8">
        <div className="max-w-sm mx-auto space-y-6">
          
          {/* Self Checkout Card - Mobile Optimized */}
          <div
            onClick={() => handleServiceClick('/self-checkout')}
            className="rounded-2xl shadow-lg cursor-pointer transform active:scale-95 transition-all duration-200 overflow-hidden"
            style={{ backgroundColor: colors.accent }}
          >
            <div className="p-6 text-center text-white">
              <div className="mb-4">
                <FiTablet size={48} className="mx-auto" />
              </div>
              <h2 className="text-xl font-bold mb-2">Self Checkout</h2>
              <p className="text-sm opacity-90 mb-4">Order by yourself, no waiting</p>
              <div className="text-xs opacity-80">
                Browse • Order • Pay • Go
              </div>
            </div>
          </div>

          {/* AI Assistant Card - Mobile Optimized */}
          <div
            onClick={() => handleServiceClick('/chatbot')}
            className="rounded-2xl shadow-lg cursor-pointer transform active:scale-95 transition-all duration-200 overflow-hidden"
            style={{ backgroundColor: colors.secondary }}
          >
            <div className="p-6 text-center text-white">
              <div className="mb-4">
                <FiMessageSquare size={48} className="mx-auto" />
              </div>
              <h2 className="text-xl font-bold mb-2">AI Assistant</h2>
              <p className="text-sm opacity-90 mb-4">Chat for help & recommendations</p>
              <div className="text-xs opacity-80">
                Ask • Get Help • Order • Done
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Simple Footer */}
      <div className="text-center py-4 px-4">
        <p className="text-xs" style={{ color: colors.muted }}>
          Tap any service to get started
        </p>
      </div>
    </div>
  );
};

export default MobileLanding;
