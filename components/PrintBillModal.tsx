import React from 'react';
import type { DetailedBill } from '../types';

interface PrintBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: DetailedBill | null;
}

const PrintBillModal: React.FC<PrintBillModalProps> = ({ isOpen, onClose, bill }) => {
  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const subtotal = bill.items.reduce((acc, item) => acc + item.mrp * item.quantity, 0);
  const totalGst = bill.items.reduce((acc, item) => {
    const itemTotal = item.mrp * item.quantity;
    const taxableValue = itemTotal / (1 + item.gstPercent / 100);
    return acc + (itemTotal - taxableValue);
  }, 0);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center backdrop-blur-sm no-print">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg transform transition-all flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Invoice Preview</h3>
          <button onClick={onClose} className="p-1 text-gray-500 rounded-full hover:bg-gray-200 hover:text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div id="print-area" className="p-6 overflow-y-auto text-black bg-white">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">{bill.pharmacy.pharmacyName}</h1>
            <p className="text-sm">DLN: {bill.pharmacy.drugLicense} | GSTIN: {bill.pharmacy.gstNumber}</p>
          </div>
          <div className="flex justify-between text-sm border-b pb-2 mb-2">
            <div>
              <p><strong>Invoice No:</strong> {bill.id}</p>
              <p><strong>Date:</strong> {bill.date}</p>
            </div>
            <div>
              <p><strong>Billed to:</strong></p>
              <p>{bill.customerName}</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left font-semibold py-2">Item</th>
                <th className="text-center font-semibold py-2">Qty</th>
                <th className="text-right font-semibold py-2">Rate</th>
                <th className="text-right font-semibold py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map(item => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.name}</td>
                  <td className="text-center py-2">{item.quantity}</td>
                  <td className="text-right py-2">₹{item.mrp.toFixed(2)}</td>
                  <td className="text-right py-2">₹{(item.mrp * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end mt-4">
            <div className="w-64 text-sm">
              <div className="flex justify-between"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Total GST:</span><span>₹{totalGst.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t mt-1 pt-1"><span>Grand Total:</span><span>₹{bill.total.toFixed(2)}</span></div>
            </div>
          </div>
          <div className="mt-12 text-sm text-center">
            <p>Thank you for your visit!</p>
            <p className="mt-8 pt-4 border-t w-1/3 mx-auto">For {bill.pharmacy.pharmacyName}</p>
            <p className="mt-1 font-semibold">{bill.pharmacy.authorizedSignatory}</p>
          </div>
        </div>

        <div className="flex justify-end p-4 bg-gray-50 border-t">
            <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                Close
            </button>
            <button onClick={handlePrint} className="ml-3 px-5 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">
                Print
            </button>
        </div>
      </div>
    </div>
  );
};

export default PrintBillModal;
