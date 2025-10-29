import React from 'react';
import Modal from './Modal';
import type { Purchase } from '../types';

interface PurchaseDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    purchase: Purchase | null;
}

const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({ isOpen, onClose, purchase }) => {
    if (!isOpen || !purchase) return null;

    const { totalAmount, items } = purchase;
    const subtotal = items.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
    const totalGst = totalAmount - subtotal;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Details for Purchase Invoice #${purchase.invoiceNumber}`}>
            <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                    <div><span className="font-semibold text-gray-600">Supplier:</span> {purchase.supplier}</div>
                    <div><span className="font-semibold text-gray-600">Invoice:</span> {purchase.invoiceNumber}</div>
                    <div><span className="font-semibold text-gray-600">Date:</span> {new Date(purchase.date).toLocaleDateString('en-IN')}</div>
                </div>

                <div className="flow-root max-h-[40vh] overflow-y-auto pr-2 border-t pt-4">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0"><tr>
                          <th className="py-2 px-2 text-left font-medium text-gray-600">Item</th>
                          <th className="py-2 px-2 text-left font-medium text-gray-600">Batch</th>
                          <th className="py-2 px-2 text-left font-medium text-gray-600">Expiry</th>
                          <th className="py-2 px-2 text-center font-medium text-gray-600">Qty</th>
                          <th className="py-2 px-2 text-right font-medium text-gray-600">Price</th>
                          <th className="py-2 px-2 text-right font-medium text-gray-600">GST(%)</th>
                          <th className="py-2 px-2 text-right font-medium text-gray-600">Amount</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                          {purchase.items.map(item => (
                              <tr key={item.id}>
                                  <td className="p-2 font-medium">{item.name}</td>
                                  <td className="p-2">{item.batch}</td>
                                  <td className="p-2">{item.expiry}</td>
                                  <td className="p-2 text-center">{item.quantity}</td>
                                  <td className="p-2 text-right">₹{item.purchasePrice.toFixed(2)}</td>
                                  <td className="p-2 text-right">{item.gstPercent.toFixed(2)}%</td>
                                  <td className="p-2 text-right font-medium">₹{(item.purchasePrice * item.quantity).toFixed(2)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                </div>
            </div>

            <div className="flex justify-between items-end p-5 bg-gray-50 rounded-b-2xl border-t mt-auto">
                <div className="grid grid-cols-1 gap-x-8 text-sm">
                    <div>
                        <div className="flex justify-between w-56"><span>Taxable Value:</span> <span className="font-medium text-gray-700">₹{subtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56"><span>Total GST:</span> <span className="font-medium text-gray-700">+ ₹{totalGst.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56 mt-1 border-t pt-1 text-base font-semibold text-gray-900"><span>Grand Total:</span> <span>₹{totalAmount.toFixed(2)}</span></div>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Close</button>
                </div>
            </div>
        </Modal>
    );
};

export default PurchaseDetailModal;