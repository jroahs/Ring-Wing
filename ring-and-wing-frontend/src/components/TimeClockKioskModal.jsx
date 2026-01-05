import React from 'react';
import { Modal } from './ui';
import TimeClock from '../TimeClock';

const TimeClockKioskModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Time Clock"
      size="full"
      className="max-w-6xl"
    >
      <TimeClock embedded />
    </Modal>
  );
};

export default TimeClockKioskModal;
