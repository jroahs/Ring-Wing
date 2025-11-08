import React, { useState } from 'react';
import { FiInfo, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { FaLightbulb } from 'react-icons/fa';
import PropTypes from 'prop-types';

/**
 * A reusable tips section component that can be added to any page or modal
 * @param {Object} props - Component props
 * @param {Array} props.tips - Array of tip strings to display 
 * @param {string} props.title - Optional title for the tips section (defaults to "Tips:")
 * @param {string} props.accentColor - Color to use for accents (defaults to "orange") 
 * @param {string} props.position - Position of the tips button ("right" or "left", defaults to "right")
 * @param {boolean} props.defaultOpen - Whether the tips section should be open by default
 * @param {string} props.className - Additional CSS classes to apply to the container
 * @param {boolean} props.withHeader - Whether to display a styled header with the title
 * @param {string} props.headerTitle - Title to display in the header (if different from tips title)
 * @param {boolean} props.withBulb - Whether to show the lightbulb icon in the header
 * @param {boolean} props.compact - Use a more compact layout for tips
 * @returns {JSX.Element}
 */
const TipsSection = ({
  tips,
  title = "Tips:",
  accentColor = "orange",
  position = "right",
  defaultOpen = false,
  className = "",
  withHeader = false,
  headerTitle,
  withBulb = true,
  compact = false,
}) => {
  const [showTips, setShowTips] = useState(defaultOpen);

  return (
    <div className={`relative ${className}`}>
      {/* Optional Header with Bulblight Icon - no gradient */}
      {withHeader && (
        <div className="py-3 px-4 bg-orange-500 rounded-t-lg flex items-center justify-between text-white">
          <div className="flex items-center">
            {withBulb && (
              <div className="p-2 rounded-full bg-white mr-3 shadow-lg">
                <FaLightbulb className="text-lg text-orange-500" />
              </div>
            )}
            <h2 className="text-xl font-bold">
              {headerTitle || title}
            </h2>
          </div>
          <button 
            onClick={() => setShowTips(!showTips)}
            className="p-2 rounded-full hover:bg-orange-400 transition-colors flex items-center"
            title={showTips ? "Hide Tips" : "Show Tips"}
          >
            <FiInfo className="text-white mr-1" />
            {showTips ? <FiChevronUp className="text-white" /> : <FiChevronDown className="text-white" />}
          </button>
        </div>
      )}

      {/* Standalone Tips toggle button (only shown if not using header) */}
      {!withHeader && (
        <div className={`flex items-center justify-${position === "right" ? "end" : "start"} mb-2`}>
          <button
            onClick={() => setShowTips(!showTips)}
            className="p-2 rounded-full transition-colors hover:bg-orange-200 text-orange-500 flex items-center"
            title={showTips ? "Hide Tips" : "Show Tips"}
            aria-label={showTips ? "Hide Tips" : "Show Tips"}
          >
            <FiInfo className="mr-1" />
            {showTips ? <FiChevronUp /> : <FiChevronDown />}
          </button>
        </div>
      )}

      {/* Tips content - with background color as you liked */}
      {showTips && (
        <div className={`p-4 ${!withHeader ? 'rounded-lg' : 'border-t border-orange-600'} animate-fade-in bg-orange-50`}>
          {/* Only show title inside content area if not using header or if titles are different */}
          {(!withHeader || (withHeader && headerTitle && headerTitle !== title)) && (
            <h3 className="font-bold text-orange-700 mb-1">{title}</h3>
          )}
          
          <ul className="list-disc pl-5 space-y-2">
            {tips.map((tip, index) => (
              <li key={index} className="text-orange-500" dangerouslySetInnerHTML={{ __html: tip }} />
            ))}
          </ul>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

TipsSection.propTypes = {
  tips: PropTypes.arrayOf(PropTypes.string).isRequired,
  title: PropTypes.string,
  accentColor: PropTypes.string,
  position: PropTypes.oneOf(['right', 'left']),
  defaultOpen: PropTypes.bool,
  className: PropTypes.string,
  withHeader: PropTypes.bool,
  headerTitle: PropTypes.string,
  withBulb: PropTypes.bool,
  compact: PropTypes.bool,
};

export default TipsSection;