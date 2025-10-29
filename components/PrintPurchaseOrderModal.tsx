import React from 'react';
import type { PurchaseOrder, Distributor, RegisteredPharmacy } from '../types';
import PurchaseOrderTemplate from './invoice-templates/PurchaseOrderTemplate';

interface PrintPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: (PurchaseOrder & { distributor: Distributor }) | null;
  pharmacy: RegisteredPharmacy | null;
}

const PrintPurchaseOrderModal: React.FC<PrintPurchaseOrderModalProps> = ({ isOpen, onClose, purchaseOrder, pharmacy }) => {
    
  if (!isOpen || !purchaseOrder || !pharmacy) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="print-po-modal-container" className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl transform transition-all flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center p-4 border-b no-print">
          <h3 className="text-lg font-semibold text-gray-800">Purchase Order Preview</h3>
          <button onClick={onClose} className="p-1 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div id="print-area" className="p-8 overflow-y-auto text-black bg-white">
            <PurchaseOrderTemplate purchaseOrder={purchaseOrder} pharmacy={pharmacy} />
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

export default PrintPurchaseOrderModal;