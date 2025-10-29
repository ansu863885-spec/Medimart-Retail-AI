import React, { useState } from 'react';
import type { DetailedBill } from '../types';
import ProfessionalTemplate from './invoice-templates/ProfessionalTemplate';
import ModernTemplate from './invoice-templates/ModernTemplate';
import StandardTemplate from './invoice-templates/StandardTemplate';

interface PrintBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: DetailedBill | null;
}

const PrintBillModal: React.FC<PrintBillModalProps> = ({ isOpen, onClose, bill }) => {
  const [template, setTemplate] = useState<'professional' | 'standard' | 'modern'>('professional');
    
  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const templates = [
    { id: 'professional', name: 'Professional' },
    { id: 'standard', name: 'Standard' },
    { id: 'modern', name: 'Modern' },
  ];

  const renderTemplate = () => {
    switch (template) {
        case 'professional':
            return <ProfessionalTemplate bill={bill} />;
        case 'modern':
            return <ModernTemplate bill={bill} />;
        case 'standard':
            return <StandardTemplate bill={bill} />;
        default:
            return <ProfessionalTemplate bill={bill} />;
    }
  };

  return (
    <div id="print-bill-modal-container" className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl transform transition-all flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center p-4 border-b no-print">
          <h3 className="text-lg font-semibold text-gray-800">Invoice Preview</h3>
           <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Template:</span>
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id as any)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${template === t.id ? 'bg-[#11A66C] text-white font-semibold shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div id="print-area" className="p-8 overflow-y-auto text-black bg-white">
            {renderTemplate()}
        </div>

        <div className="flex justify-end items-center p-4 bg-gray-50 border-t no-print space-x-3">
            <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                Close
            </button>
            <button onClick={handlePrint} className="px-5 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">
                Print / Save PDF
            </button>
        </div>
      </div>
    </div>
  );
};

export default PrintBillModal;