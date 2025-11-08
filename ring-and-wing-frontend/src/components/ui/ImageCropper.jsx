import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiZoomIn, FiZoomOut, FiRotateCw } from 'react-icons/fi';
import { Button } from './Button';
import { createCroppedImage, blobToFile } from '../../utils/cropImage';

/**
 * ImageCropper - A reusable 1:1 aspect ratio image cropper component
 * 
 * @param {Object} props
 * @param {string} props.imageSrc - The source URL of the image to crop
 * @param {Function} props.onCropComplete - Callback when cropping is complete, receives the cropped File
 * @param {Function} props.onCancel - Callback when user cancels the crop
 * @param {string} props.fileName - The name for the cropped file (default: 'cropped-image.jpg')
 * @param {Object} props.colors - Theme colors object (optional)
 */
export const ImageCropper = ({
  imageSrc,
  onCropComplete,
  onCancel,
  fileName = 'cropped-image.jpg',
  colors = {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#f59e0b',
    muted: '#94a3b8',
    background: '#ffffff'
  }
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [minZoom, setMinZoom] = useState(1);

  const onCropCompleteCallback = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onMediaLoaded = useCallback((mediaSize) => {
    // For react-easy-crop, lower zoom = more of image visible
    // We want the entire image to fit, so calculate zoom to show full image
    const { naturalWidth, naturalHeight } = mediaSize;
    
    const imageAspect = naturalWidth / naturalHeight;
    
    // For 1:1 crop area:
    // - If image is square (1:1), zoom = 1 is perfect
    // - If image is wider (e.g., 16:9 = 1.78), we need zoom < 1 to see it all
    // - If image is taller (e.g., 9:16 = 0.56), we need zoom < 1 to see it all
    
    // The smaller dimension determines the zoom
    const calculatedMinZoom = Math.min(1, Math.min(imageAspect, 1 / imageAspect));
    
    setMinZoom(calculatedMinZoom);
    setZoom(calculatedMinZoom);
  }, []);

  const handleCropConfirm = async () => {
    try {
      setIsProcessing(true);
      const croppedBlob = await createCroppedImage(
        imageSrc,
        croppedAreaPixels,
        rotation
      );
      const croppedFile = blobToFile(croppedBlob, fileName);
      onCropComplete(croppedFile);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, minZoom));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="relative bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between p-4 border-b"
            style={{ borderColor: colors.muted + '40' }}
          >
            <h3 className="text-lg font-semibold" style={{ color: colors.primary }}>
              Crop Image (1:1 Ratio)
            </h3>
            <button
              onClick={onCancel}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              disabled={isProcessing}
            >
              <FiX size={20} style={{ color: colors.muted }} />
            </button>
          </div>

          {/* Cropper Area */}
          <div className="relative h-96 bg-gray-100">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropCompleteCallback}
              onZoomChange={setZoom}
              onMediaLoaded={onMediaLoaded}
              cropShape="rect"
              showGrid={true}
              objectFit="contain"
              restrictPosition={true}
              minZoom={minZoom}
            />
          </div>

          {/* Controls */}
          <div className="p-4 space-y-4">
            {/* Zoom Slider */}
            <div className="space-y-2">
              <label 
                className="block text-sm font-medium"
                style={{ color: colors.primary }}
              >
                Zoom
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                  disabled={zoom <= minZoom || isProcessing}
                  style={{ color: colors.secondary }}
                >
                  <FiZoomOut size={18} />
                </button>
                <input
                  type="range"
                  min={minZoom}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, ${colors.primary} 0%, ${colors.primary} ${((zoom - minZoom) / (3 - minZoom)) * 100}%, ${colors.muted}40 ${((zoom - minZoom) / (3 - minZoom)) * 100}%, ${colors.muted}40 100%)`
                  }}
                  disabled={isProcessing}
                />
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded hover:bg-gray-100 transition-colors"
                  disabled={zoom >= 3 || isProcessing}
                  style={{ color: colors.secondary }}
                >
                  <FiZoomIn size={18} />
                </button>
              </div>
            </div>

            {/* Rotation Control */}
            <div className="flex items-center justify-between">
              <label 
                className="block text-sm font-medium"
                style={{ color: colors.primary }}
              >
                Rotation: {rotation}°
              </label>
              <button
                onClick={handleRotate}
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 transition-colors"
                disabled={isProcessing}
                style={{ color: colors.secondary }}
              >
                <FiRotateCw size={18} />
                <span className="text-sm">Rotate 90°</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={onCancel}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCropConfirm}
                isLoading={isProcessing}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Apply Crop'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageCropper;
