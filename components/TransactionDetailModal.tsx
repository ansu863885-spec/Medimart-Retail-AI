import React from 'react';
import Modal from './Modal';
import type { Transaction, BillItem } from '../types';

interface TransactionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
    onPrintBill: (transaction: Transaction) => void;
    onProcessReturn: (invoiceId: string) => void;
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({ isOpen, onClose, transaction, onPrintBill, onProcessReturn }) => {
    if (!isOpen || !transaction) return null;

    const { total, items, amountReceived } = transaction;
    const subtotal = items.reduce((sum, item) => {
        const itemTotal = item.mrp * item.quantity;
        const priceAfterDiscount = itemTotal * (1 - (item.discountPercent || 0) / 100);
        return sum + (priceAfterDiscount / (1 + (item.gstPercent || 0) / 100));
    }, 0);
    const totalDiscount = items.reduce((sum, item) => sum + (item.mrp * item.quantity * (item.discountPercent || 0) / 100), 0);
    const totalGst = total - subtotal;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Details for Invoice #${transaction.id}`}>
            <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                    <div><span className="font-semibold text-gray-600">Customer:</span> {transaction.customerName}</div>
                    <div><span className="font-semibold text-gray-600">Phone:</span> {transaction.customerPhone || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600">Date:</span> {new Date(transaction.date).toLocaleString('en-IN')}</div>
                </div>

                <div className="flow-root max-h-[40vh] overflow-y-auto pr-2 border-t pt-4">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0"><tr>
                          <th className="py-2 px-2 text-left font-medium text-gray-600 w-2/5">Item</th>
                          <th className="py-2 px-2 text-center font-medium text-gray-600">Qty</th>
                          <th className="py-2 px-2 text-center font-medium text-gray-600">MRP</th>
                          <th className="py-2 px-2 text-center font-medium text-gray-600">Disc(%)</th>
                          <th className="py-2 px-2 text-right font-medium text-gray-600">Amount</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                          {transaction.items.map(item => (
                              <tr key={item.id}>
                                  <td className="p-2 font-medium">{item.name}</td>
                                  <td className="p-2 text-center">{item.quantity}</td>
                                  <td className="p-2 text-center">₹{item.mrp.toFixed(2)}</td>
                                  <td className="p-2 text-center">{item.discountPercent?.toFixed(2) || 0}%</td>
                                  <td className="p-2 text-right font-medium">₹{(item.mrp * item.quantity * (1 - (item.discountPercent || 0) / 100)).toFixed(2)}</td>
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
                        <div className="flex justify-between w-56"><span>Discount:</span> <span className="font-medium text-gray-700">- ₹{totalDiscount.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56"><span>Total GST:</span> <span className="font-medium text-gray-700">+ ₹{totalGst.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56 mt-1 border-t pt-1 text-base font-semibold text-gray-900"><span>Bill Total:</span> <span>₹{total.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56 text-green-600"><span>Amount Received:</span> <span className="font-medium">₹{amountReceived.toFixed(2)}</span></div>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={() => onProcessReturn(transaction.id)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Process Return</button>
                    <button onClick={() => onPrintBill(transaction)} className="px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C]">Print Bill</button>
                </div>
            </div>
        </Modal>
    );
};

export default TransactionDetailModal;
