import React, { useState } from 'react';
import Modal from './Modal';
import type { InventoryItem, Transaction, BillItem as BillItemType } from '../types';

interface BillItem extends InventoryItem {
    quantity: number;
}

interface NewBillModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddTransaction: (transaction: Transaction) => void;
    inventory: InventoryItem[];
}

const NewBillModal: React.FC<NewBillModalProps> = ({ isOpen, onClose, onAddTransaction, inventory }) => {
    const [billItems, setBillItems] = useState<BillItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [customerName, setCustomerName] = useState('');

    const searchResults = searchTerm
        ? inventory.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    const addItemToBill = (item: InventoryItem) => {
        setBillItems(prevItems => {
            const existingItem = prevItems.find(i => i.id === item.id);
            if (existingItem) {
                return prevItems.map(i =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            }
            return [...prevItems, { ...item, quantity: 1 }];
        });
        setSearchTerm('');
    };

    const updateQuantity = (id: string, newQuantity: number) => {
        if (newQuantity < 1) {
            setBillItems(prev => prev.filter(item => item.id !== id));
        } else {
            setBillItems(prev =>
                prev.map(item => (item.id === id ? { ...item, quantity: newQuantity } : item))
            );
        }
    };
    
    const subtotal = billItems.reduce((acc, item) => acc + item.mrp * item.quantity, 0);
    const gst = subtotal * 0.05; // Assuming 5% GST
    const total = subtotal + gst;

    const handleCheckout = () => {
        if (billItems.length === 0) {
            alert('Please add items to the bill first.');
            return;
        }
        
        const newTransaction: Transaction = {
            id: `INV-M-${Date.now().toString().slice(-6)}`,
            customerName: customerName || 'Walk-in',
            date: new Date().toLocaleString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }),
            total: total,
            itemCount: billItems.reduce((sum, item) => sum + item.quantity, 0),
            items: billItems.map(item => ({
                id: item.id,
                name: item.name,
                brand: item.brand,
                category: item.category,
                mrp: item.mrp,
                quantity: item.quantity,
                gstPercent: 5, // Assuming a flat 5% GST for all items for simplicity
            })),
        };

        onAddTransaction(newTransaction);
        
        // Reset state
        setBillItems([]);
        setCustomerName('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Bill">
            <div className="p-6 overflow-y-auto">
                {/* Customer and Search */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Customer Name (Optional)"
                        className="w-full px-4 py-2 border-gray-300 rounded-lg focus:ring-[#11A66C] focus:border-[#11A66C]"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                    />
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search and add products..."
                            className="w-full px-4 py-2 border-gray-300 rounded-lg focus:ring-[#11A66C] focus:border-[#11A66C]"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchResults.length > 0 && (
                            <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {searchResults.map(item => (
                                    <li key={item.id}
                                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 flex justify-between items-center"
                                        onClick={() => addItemToBill(item)}>
                                        <div>
                                          {item.name}
                                          <span className="text-sm text-gray-500 ml-2">{item.brand}</span>
                                        </div>
                                        <span className="text-sm font-semibold">₹{item.mrp.toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Bill Items Table */}
                <div className="flow-root max-h-[40vh] overflow-y-auto pr-2">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                          <tr>
                              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-2">Item</th>
                              <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 w-32">Quantity</th>
                              <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Price</th>
                              <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Amount</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                          {billItems.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-gray-500">No items added. Start by searching for a product.</td>
                            </tr>
                          )}
                          {billItems.map(item => (
                              <tr key={item.id}>
                                  <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-2">{item.name}</td>
                                  <td className="px-3 py-2 text-sm text-gray-500">
                                      <input type="number" min="1" value={item.quantity} onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 0)} className="w-20 text-center border-gray-300 rounded-md shadow-sm focus:ring-[#11A66C] focus:border-[#11A66C]"/>
                                  </td>
                                  <td className="px-3 py-4 text-sm text-right text-gray-500">₹{item.mrp.toFixed(2)}</td>
                                  <td className="px-3 py-4 text-sm text-right font-medium text-gray-800">₹{(item.mrp * item.quantity).toFixed(2)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                </div>
            </div>

            {/* Footer with totals and actions */}
            <div className="flex justify-between items-end p-5 bg-gray-50 rounded-b-2xl border-t mt-auto">
                <div className="text-sm">
                    <div className="flex justify-between w-56"><span>Subtotal:</span> <span className="font-medium text-gray-700">₹{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between w-56"><span>GST (5%):</span> <span className="font-medium text-gray-700">₹{gst.toFixed(2)}</span></div>
                    <div className="flex justify-between w-56 mt-1 border-t pt-1 text-lg font-semibold text-gray-900"><span>Total:</span> <span>₹{total.toFixed(2)}</span></div>
                </div>
                <div className="flex space-x-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleCheckout} className="px-5 py-2.5 text-sm font-semibold text-white bg-[#35C48D] rounded-lg shadow-sm hover:bg-[#11A66C] transition-colors">
                        Print & Checkout
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default NewBillModal;