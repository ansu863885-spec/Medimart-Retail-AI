
import React from 'react';
import Modal from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} widthClass="max-w-md">
      <div className="p-6">
        <p className="text-app-text-secondary">{message}</p>
      </div>
      <div className="flex justify-end p-4 bg-hover border-t border-app-border space-x-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold bg-card-bg border border-app-border rounded-lg shadow-sm hover:bg-hover"
        >
          No
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700"
        >
          Yes
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
