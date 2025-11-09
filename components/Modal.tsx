import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  widthClass?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, widthClass }) => {
  if (!isOpen) return null;

  const handleKeydown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm modal-backdrop-fade-in"
      onClick={onClose}
      onKeyDown={handleKeydown}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className={`bg-card-bg rounded-2xl shadow-xl w-full ${widthClass || 'max-w-3xl'} flex flex-col max-h-[90vh] page-fade-in`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-app-border sticky top-0 bg-card-bg rounded-t-2xl z-10">
          <h3 className="text-xl font-semibold text-app-text-primary">{title}</h3>
          <button onClick={onClose} className="p-1 text-app-text-secondary rounded-full hover:bg-hover hover:text-app-text-primary transition-colors" aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;