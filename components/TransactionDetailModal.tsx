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

    const { 
        total, 
        items, 
        amountReceived, 
        subtotal, 
        totalItemDiscount, 
        totalGst, 
        schemeDiscount, 
        roundOff 
    } = transaction;

    // For backward compatibility with transactions saved before the breakdown fields were added
    const displaySubtotal = subtotal ?? items.reduce((sum, item) => {
        const itemTotal = item.mrp * item.quantity;
        const priceAfterDiscount = itemTotal * (1 - (item.discountPercent || 0) / 100);
        return sum + (priceAfterDiscount / (1 + (item.gstPercent || 0) / 100));
    }, 0);
    const displayItemDiscount = totalItemDiscount ?? items.reduce((sum, item) => sum + (item.mrp * item.quantity * (item.discountPercent || 0) / 100), 0);
    const displayGst = totalGst ?? ((total || 0) - displaySubtotal);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Details for Invoice #${transaction.id}`}>
            {transaction.status === 'cancelled' && (
                <div className="bg-red-100 text-red-800 p-4 font-bold text-center text-lg">
                    CANCELLED
                </div>
            )}
            <div className="p-6 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                    <div><span className="font-semibold text-gray-600">Customer:</span> {transaction.customerName}</div>
                    <div><span className="font-semibold text-gray-600">Phone:</span> {transaction.customerPhone || 'N/A'}</div>
                    <div><span className="font-semibold text-gray-600">Date:</span> {new Date(transaction.date).toLocaleString('en-IN')}</div>
                    {transaction.referredBy && <div><span className="font-semibold text-gray-600">Referred By (RMP):</span> {transaction.referredBy}</div>}
                </div>

                <div className="flow-root max-h-[40vh] overflow-y-auto pr-2 border-t pt-4">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0"><tr>
                          <th className="py-2 px-2 text-left font-medium text-gray-600 w-2/5">Item</th>
                          <th className="py-2 px-2 text-center font-medium text-gray-600">Qty</th>
                          <th className="py-2 px-2 text-center font-medium text-gray-600">Unit</th>
                          <th className="py-2 px-2 text-center font-medium text-gray-600">MRP</th>
                          <th className="py-2 px-2 text-center font-medium text-gray-600">Disc(%)</th>
                          <th className="py-2 px-2 text-right font-medium text-gray-600">Amount</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                          {transaction.items.map(item => (
                              <tr key={item.id}>
                                  <td className="p-2 font-medium">{item.name}</td>
                                  <td className="p-2 text-center">{item.quantity}</td>
                                  <td className="p-2 text-center capitalize">{item.unit}</td>
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
                        <div className="flex justify-between w-56"><span>Subtotal:</span> <span className="font-medium text-gray-700">₹{displaySubtotal.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56"><span>Item Discounts:</span> <span className="font-medium text-gray-700">- ₹{displayItemDiscount.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56"><span>Total GST:</span> <span className="font-medium text-gray-700">+ ₹{displayGst.toFixed(2)}</span></div>
                        <div className="flex justify-between w-56"><span>Scheme Discount:</span> <span className="font-medium text-gray-700">- ₹{(schemeDiscount || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between w-56"><span>Round Off:</span> <span className="font-medium text-gray-700">{roundOff >= 0 ? '+' : '-'} ₹{Math.abs(roundOff || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between w-56 mt-1 border-t pt-1 text-base font-semibold text-gray-900"><span>Grand Total:</span> <span>₹{(total || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between w-56 text-green-600"><span>Amount Received:</span> <span className="font-medium">₹{(amountReceived || 0).toFixed(2)}</span></div>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={() => onProcessReturn(transaction.id)} disabled={transaction.status === 'cancelled'} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed">Process Return</button>
                    <button onClick={() => onPrintBill(transaction)} disabled={transaction.status === 'cancelled'} className="px-4 py-2 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] disabled:bg-gray-400 disabled:cursor-not-allowed">Print Bill</button>
                </div>
            </div>
        </Modal>
    );
};

export default TransactionDetailModal;