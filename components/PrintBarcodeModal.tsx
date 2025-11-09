import React, { useEffect, useRef, useState } from 'react';
import type { InventoryItem, RegisteredPharmacy } from '../types';
import { renderBarcode } from '../utils/barcode';

interface PrintBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  pharmacy: RegisteredPharmacy | null;
}

const PrintBarcodeModal: React.FC<PrintBarcodeModalProps> = ({ isOpen, onClose, item, pharmacy }) => {
  const [labelCount, setLabelCount] = useState(12);

  if (!isOpen || !item || !pharmacy) return null;

  const handlePrint = () => {
    window.print();
  };

  const BarcodeLabel: React.FC<{ item: InventoryItem; pharmacy: RegisteredPharmacy }> = ({ item, pharmacy }) => {
    const barcodeRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
      if (barcodeRef.current && item.barcode) {
        renderBarcode(barcodeRef.current, item.barcode);
      }
    }, [item.barcode]);

    return (
      <div className="barcode-label">
        <p className="pharmacy-name">{pharmacy.pharmacyName}</p>
        <p className="product-name">{item.name}</p>
        <svg ref={barcodeRef} className="max-w-full h-8"></svg>
        <p className="mrp">MRP: ₹{item.mrp.toFixed(2)}</p>
      </div>
    );
  };

  return (
    <div id="print-barcode-modal-container" className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl transform transition-all flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center p-4 border-b no-print">
          <h3 className="text-lg font-semibold text-gray-800">Print Barcode for: {item.name}</h3>
          <div className="flex items-center space-x-2">
            <label htmlFor="label-count" className="text-sm font-medium">Labels:</label>
            <input
              id="label-count"
              type="number"
              value={labelCount}
              onChange={(e) => setLabelCount(parseInt(e.target.value, 10) || 1)}
              className="w-20 p-1 border border-gray-300 rounded-md"
              min="1"
            />
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div id="print-barcode-area" className="p-4 overflow-y-auto text-black bg-white">
          {Array.from({ length: labelCount }).map((_, i) => (
            <BarcodeLabel key={i} item={item} pharmacy={pharmacy} />
          ))}
        </div>

        <div className="flex justify-end items-center p-4 bg-gray-50 border-t no-print space-x-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
            Close
          </button>
          <button onClick={handlePrint} className="px-5 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">
            Print Labels
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintBarcodeModal;
