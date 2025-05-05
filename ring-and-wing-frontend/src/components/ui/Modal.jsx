import { useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../../theme';
import { Button } from './Button';
import { FiX } from 'react-icons/fi';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  preventClose = false,
  footer,
  className = ''
}) => {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !preventClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, preventClose]);

  const handleBackdropClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target) && !preventClose) {
      onClose();
    }
  };

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full'
  };

  if (!isOpen) return null;

  return createPortal(
    <Fragment>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={handleBackdropClick}
      >
        {/* Modal */}
        <div
          ref={modalRef}
          className={`
            w-full relative rounded-xl shadow-xl
            animate-modal-enter
            ${sizes[size]}
            ${className}
          `}
          style={{ backgroundColor: theme.colors.background }}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 border-b"
                 style={{ borderColor: theme.colors.muted + '20' }}>
              {title && (
                <h3 
                  className="text-lg font-medium"
                  style={{ color: theme.colors.primary }}
                >
                  {title}
                </h3>
              )}
              {showCloseButton && !preventClose && (
                <Button
                  variant="text"
                  size="sm"
                  onClick={onClose}
                  className="-mr-2"
                >
                  <FiX className="w-5 h-5" />
                </Button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div 
              className="flex justify-end gap-2 p-4 border-t"
              style={{ borderColor: theme.colors.muted + '20' }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-modal-enter {
          animation: modal-enter 0.2s ease-out;
        }
      `}</style>
    </Fragment>,
    document.body
  );
};